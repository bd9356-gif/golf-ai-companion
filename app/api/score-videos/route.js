import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const AUTO_APPROVE_THRESHOLD = 7
const VALID_BUCKETS = new Set(['full_swing', 'short_game', 'putting', 'course_management'])

const PROMPT_TEMPLATE = (title, channel, description) => `You are a golf instruction expert. Analyze this YouTube video and return ONLY a JSON object with no markdown or backticks.

Video title: ${title}
Channel: ${channel}
Description: ${description}

NOTE: Ignore promotional content, social media links, or channel boilerplate. Focus only on the golf instruction. If description says '(No description available)', base your analysis entirely on the video title.

Return this exact JSON structure:
{
  "primary_bucket": "full_swing",
  "sub_tags": ["driver","tempo"],
  "skill_tiers": ["beginner"],
  "topics": ["driving"],
  "ai_summary": "summary here",
  "quality_score": 7.5,
  "quality_reason": "one-line justification"
}

Rules:

- primary_bucket (REQUIRED, exactly one of):
    full_swing          -- driving, iron play, tempo, grip, stance, full-swing drills, fundamentals
    short_game          -- chipping, pitching, bunker play, greenside wedges, ~50y and in
    putting             -- putting stroke, reading greens, lag putting, distance control
    course_management   -- strategy, mental game, scoring, pre-shot routine, club selection, on-course decisions
  Pick the SINGLE best fit. Fitness and mental-game videos both map to course_management (or to the relevant physical bucket if the drill is swing-specific).

- sub_tags: array of 1-5 fine-grained tags. Choose from:
    driver, iron, wedge, hybrid, 3-wood, fairway-wood, tempo, grip, stance, posture,
    takeaway, backswing, downswing, impact, follow-through, release, shallowing,
    chipping, pitching, bunker, flop, lob, chunk-fix, thin-fix,
    putting-stroke, green-reading, lag-putting, short-putt, speed-control,
    strategy, mental, pre-shot-routine, course-management, club-selection,
    fitness, mobility, senior

- skill_tiers: array, choose from ONLY these exact values:
  beginner, building_game, building_consistency, improving_player, advanced_player, senior_player

  - "beginner" = complete newcomers, very basic fundamentals
  - "building_game" = high handicappers scoring 100+, basic consistency
  - "building_consistency" = scoring 90-100, inconsistent fundamentals
  - "improving_player" = scoring 80-90, solid fundamentals, working on scoring
  - "advanced_player" = scoring 70-80, low handicap, shot shaping and strategy
  - "senior_player" = older golfers focusing on mobility, flexibility, slower swing speed, joint-friendly mechanics, rhythm over power

  Include ALL tiers the video genuinely applies to.

- topics: array of 1-3 from the legacy vocabulary (kept for backward compat):
    driving, iron play, short game, putting, chipping, pitching, bunker,
    course management, mental game, fitness, rules, equipment, grip, stance, swing

- quality_score: 1-10
- quality_reason: ONE short sentence explaining the score (e.g. "Clear demo, well-shot, but covers ground already in other putting basics videos.")
- ai_summary: 2-3 specific sentences. Exact problem solved, technique taught, who it is for. No generic summaries.

Return ONLY the JSON, nothing else`

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Find ONE video that hasn't been scored under the NEW prompt yet
    // (signal: videos.primary_bucket is null). Scan in pages and filter
    // client-side — this avoids RLS/filter edge cases with .is(null) on
    // newly-added columns.
    const pageSize = 1000
    let page = 0
    let unscoredVideo = null
    let nullBucketCount = 0

    outer: while (true) {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, description, channel_name, primary_bucket')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const video of data) {
        if (video.primary_bucket == null) {
          nullBucketCount++
          if (!unscoredVideo) unscoredVideo = video
        }
      }

      if (data.length < pageSize) break
      page++
    }

    if (!unscoredVideo) {
      return NextResponse.json({ success: true, message: 'All videos are scored under the new prompt!' })
    }

    const remaining = nullBucketCount

    // Step 3: Score the single video
    // Clean description — if empty or too short, use title as fallback
    const desc = (unscoredVideo.description || '').trim()
    const cleanDesc = desc.length > 20 ? desc : '(No description available — use title only)'

    const prompt = PROMPT_TEMPLATE(
      unscoredVideo.title || '',
      unscoredVideo.channel_name || '',
      cleanDesc
    )

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
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const claudeData = await response.json()
    const text = claudeData.content?.[0]?.text

    if (!text) {
      return NextResponse.json({ success: false, error: 'No response from Claude', remaining })
    }

    let result
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      result = JSON.parse(clean)
    } catch {
      return NextResponse.json({ success: false, error: 'JSON parse failed', raw: text, remaining })
    }

    const bucket = VALID_BUCKETS.has(result.primary_bucket) ? result.primary_bucket : null
    const score = Number(result.quality_score) || 0
    const shouldApprove = bucket && score >= AUTO_APPROVE_THRESHOLD

    // 1. Write enrichment
    const { error: metaError } = await supabase
      .from('video_metadata')
      .upsert({
        video_id: unscoredVideo.id,
        skill_tiers: result.skill_tiers,
        topics: result.topics,
        sub_tags: Array.isArray(result.sub_tags) ? result.sub_tags : [],
        ai_summary: result.ai_summary,
        quality_score: result.quality_score,
        quality_reason: result.quality_reason || null,
        status: 'approved'
      }, { onConflict: 'video_id' })

    if (metaError) {
      return NextResponse.json({ success: false, error: metaError.message, remaining })
    }

    // 2. Stamp bucket + editorial_status on the video
    const { error: videoError } = await supabase
      .from('videos')
      .update({
        primary_bucket: bucket,
        editorial_status: shouldApprove ? 'approved' : 'starter'
      })
      .eq('id', unscoredVideo.id)

    if (videoError) {
      return NextResponse.json({ success: false, error: videoError.message, remaining })
    }

    return NextResponse.json({
      success: true,
      message: `Scored "${unscoredVideo.title}" → ${bucket || 'unbucketed'} · q=${score} · ${shouldApprove ? 'approved' : 'starter'}. ${remaining - 1} remaining.`
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
