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
{"skill_tiers": ["beginner"], "topics": ["driving"], "ai_summary": "summary here", "quality_score": 7.5}

Rules:

- skill_tiers: array, choose from: beginner, intermediate, advanced. Only include tiers this video is genuinely appropriate for.

- topics: array of 1-3 topics. Choose ONLY from this exact list:
  driving, iron play, short game, putting, chipping, pitching, bunker, course management, mental game, fitness, rules, equipment, grip, stance, swing

  Guidelines for topic selection:
  - "driving" = driver, tee shots, hitting off the tee, distance off tee
  - "iron play" = iron shots, approach shots, ball striking, hitting irons, contact
  - "short game" = shots inside 100 yards, wedge play (general)
  - "chipping" = chip shots around the green, bump and run
  - "pitching" = pitch shots, flop shots, half-swing wedge
  - "putting" = putting stroke, green reading, lag putting, short putts
  - "bunker" = sand shots, bunker play, greenside bunker
  - "swing" = ONLY use when video is specifically about full swing mechanics (not driving or iron play specifically)
  - "grip" = ONLY use when grip is the primary focus
  - "stance" = ONLY use when setup/stance is the primary focus
  - "course management" = strategy, shot selection, game planning
  - "mental game" = mindset, focus, dealing with pressure
  - "fitness" = physical conditioning, flexibility, strength for golf
  - "rules" = rules of golf
  - "equipment" = club fitting, club selection, gear

  Pick the MOST SPECIFIC topic. Prefer "driving" over "swing" for driver videos. Prefer "iron play" over "swing" for iron videos.

- quality_score: 1-10 based on how helpful and instructional this looks

- ai_summary: Write 2-3 sentences that are VERY SPECIFIC. Mention:
  the exact problem being solved (e.g. slice, hook, fat shots, thin shots, putting yips),
  the specific technique or drill taught,
  and who it is for.
  Use specific golf terms. Do NOT write generic summaries like "improves your game".

- Return ONLY the JSON, nothing else`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const claudeData = await response.json()
      const text = claudeData.content[0].text

      let result
      try {
        result = JSON.parse(text)
      } catch {
        continue
      }

      const { error: insertError } = await supabase
        .from('video_metadata')
        .insert({
          video_id: video.id,
          skill_tiers: result.skill_tiers,
          topics: result.topics,
          ai_summary: result.ai_summary,
          quality_score: result.quality_score,
          status: 'approved'
        })

      if (!insertError) totalScored++
    }

    return NextResponse.json({ success: true, message: `Scored ${totalScored} videos` })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}