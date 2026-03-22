import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    const { data: scored } = await supabase
      .from('video_metadata')
      .select('video_id')

    const scoredIds = scored?.map(r => r.video_id) ?? []

    let query = supabase
      .from('videos')
      .select('id, title, description, channel_name')
      .limit(10)

    if (scoredIds.length > 0) {
      query = query.not('id', 'in', `(${scoredIds.join(',')})`)
    }

    const { data: videos, error } = await query

    if (error) throw error
    if (!videos.length) return NextResponse.json({ success: true, message: 'No unscored videos found' })

    let totalScored = 0

    for (const video of videos) {
      const prompt = `You are a golf instruction expert. Analyze this YouTube video and return ONLY a JSON object with no markdown or backticks.

Video title: ${video.title}
Channel: ${video.channel_name}
Description: ${video.description}

Return this exact JSON structure:
{"skill_tiers": ["beginner"], "topics": ["swing"], "ai_summary": "summary here", "quality_score": 7.5}

Rules:
- skill_tiers: choose from beginner, intermediate, advanced. Only include tiers this video is genuinely appropriate for.
- topics: choose from grip, stance, swing, putting, chipping, pitching, bunker, course management, mental game, fitness, rules, equipment
- quality_score: 1-10 based on how helpful this looks
- ai_summary: Write 2-3 sentences that are VERY SPECIFIC. You MUST mention: the exact problem being solved (e.g. slice, hook, fat shots, thin shots, putting yips, bunker play), the specific technique or drill taught, and who it is for. Use specific golf terms like: slice, hook, draw, fade, impact position, swing plane, club path, face angle, weight transfer, hip rotation, wrist hinge, follow through, chip shot, pitch shot, flop shot, lag putt, green reading, bunker explosion shot. Do NOT write generic summaries like "improves your game" - be specific about what problem this video fixes.
- Return ONLY the JSON nothing else`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const claudeData = await response.json()
      const text = claudeData.content[0].text

      let scored
      try {
        scored = JSON.parse(text)
      } catch {
        continue
      }

      const { error: insertError } = await supabase
        .from('video_metadata')
        .insert({
          video_id: video.id,
          skill_tiers: scored.skill_tiers,
          topics: scored.topics,
          ai_summary: scored.ai_summary,
          quality_score: scored.quality_score,
          status: 'approved'
        })

      if (!insertError) totalScored++
    }

    return NextResponse.json({ success: true, message: `Scored ${totalScored} videos` })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}