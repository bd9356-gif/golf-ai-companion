import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route: use the service role key so we can write to `pros` and
// update `videos.pro_id` regardless of RLS. Never expose this key to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Only seed channels with at least this many videos in our library. Smaller
// channels fall through to the null-pro fallback (the raw channel name still
// shows in the UI).
const MIN_VIDEOS_TO_SEED = 5

const PROMPT = (channelName, videoCount, sampleTitles) => `You are filling in a "pro record" for a golf YouTube channel so it can be attributed in a golf-instruction app. Return ONLY a JSON object, no markdown, no backticks.

Channel name: ${channelName}
Videos in our library from this channel: ${videoCount}
Sample video titles from this channel:
${sampleTitles.map(t => '- ' + t).join('\n')}

Return this JSON:
{
  "slug": "url-safe-slug",
  "display_name": "Human-friendly display name",
  "bio": "1-2 sentence bio",
  "website_url": "https://...",
  "booking_url": null,
  "youtube_channel_name": "exact channel name as shown in YouTube",
  "pga_certified": false
}

Rules:
- slug: lowercase, words separated by hyphens, url-safe (e.g. 'rick-shiels-golf', 'me-and-my-golf', 'titleist')
- display_name: the human-recognizable name (e.g. "Rick Shiels", "Me and My Golf", "Titleist")
- bio: 1-2 sentences, cozy and factual, mentioning the channel's focus or notable pros. If you don't know enough about this channel to write a real bio, set bio to null — do NOT invent details.
- website_url: the primary known URL for this channel/academy/brand (e.g. "https://rickshiels.com", "https://titleist.com"). Return null if you don't know a real URL — do NOT guess.
- booking_url: a "book a lesson" URL if you know one, else null.
- youtube_channel_name: echo back exactly what was given.
- pga_certified: true only if you KNOW one or more prominent hosts on this channel is PGA-certified. Default false when uncertain.

Return ONLY the JSON.`

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Pull every channel_name from videos and tally counts client-side
    const { data: channelRows, error: chErr } = await supabase
      .from('videos')
      .select('channel_name')
      .not('channel_name', 'is', null)
      .range(0, 9999)

    if (chErr) throw chErr

    const counts = new Map()
    for (const row of channelRows || []) {
      const name = (row.channel_name || '').trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }

    // 2. Skip channels we've already seeded
    const { data: existingPros, error: prErr } = await supabase
      .from('pros')
      .select('youtube_channel_name')

    if (prErr) throw prErr

    const seeded = new Set(
      (existingPros || []).map(p => p.youtube_channel_name).filter(Boolean)
    )

    const sorted = [...counts.entries()]
      .filter(([name]) => !seeded.has(name))
      .filter(([, count]) => count >= MIN_VIDEOS_TO_SEED)
      .sort((a, b) => b[1] - a[1])

    if (sorted.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No more channels to seed (threshold: ${MIN_VIDEOS_TO_SEED}+ videos).`
      })
    }

    const [channelName, videoCount] = sorted[0]
    const remaining = sorted.length

    // 3. Sample up to 5 titles for Claude context
    const { data: samples } = await supabase
      .from('videos')
      .select('title')
      .eq('channel_name', channelName)
      .limit(5)

    const sampleTitles = (samples || []).map(s => s.title).filter(Boolean)

    // 4. Draft with Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: PROMPT(channelName, videoCount, sampleTitles) }]
      })
    })

    const claudeData = await response.json()
    const text = claudeData.content?.[0]?.text

    if (!text) {
      return NextResponse.json({ success: false, error: 'No response from Claude', channel: channelName })
    }

    let draft
    try {
      draft = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ success: false, error: 'JSON parse failed', raw: text, channel: channelName })
    }

    // 5. Insert pro with status='pending'
    const slug = (draft.slug || channelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
      .slice(0, 80)

    const { data: newPro, error: insErr } = await supabase
      .from('pros')
      .insert({
        slug,
        display_name: draft.display_name || channelName,
        bio: draft.bio || null,
        website_url: draft.website_url || null,
        booking_url: draft.booking_url || null,
        youtube_channel_name: draft.youtube_channel_name || channelName,
        pga_certified: !!draft.pga_certified,
        is_featured: false,
        status: 'pending'
      })
      .select('id, slug, display_name')
      .single()

    if (insErr) {
      return NextResponse.json({ success: false, error: insErr.message, channel: channelName })
    }

    // 6. Backfill pro_id on every matching video
    const { error: upErr, count: linkedCount } = await supabase
      .from('videos')
      .update({ pro_id: newPro.id }, { count: 'exact' })
      .eq('channel_name', channelName)
      .is('pro_id', null)

    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message, pro: newPro.id })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded "${newPro.display_name}" (${channelName}) · ${linkedCount ?? videoCount} videos linked · pending review. ${remaining - 1} remaining.`
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
