import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PROMPT_TEMPLATE = (title, channel, description) => `You are a golf instruction expert. Analyze this YouTube video and return ONLY a JSON object with no markdown or backticks.

Video title: ${title}
Channel: ${channel}
Description: ${description}

NOTE: Ignore promotional content, social media links, or channel boilerplate. Focus only on the golf instruction.

Return this exact JSON structure:
{"skill_tiers": ["beginner"], "topics": ["driving"], "ai_summary": "summary here", "quality_score": 7.5}

Rules:

- skill_tiers: array, choose from ONLY these exact values:
  beginner, building_game, building_consistency, improving_player, advanced_player

  - "beginner" = complete newcomers, very basic fundamentals
  - "building_game" = high handicappers scoring 100+, basic consistency
  - "building_consistency" = scoring 90-100, understand basics but inconsistent
  - "improving_player" = scoring 80-90, solid fundamentals, working on scoring
  - "advanced_player" = scoring 70-80, low handicap, shot shaping and strategy

  Include ALL tiers the video genuinely applies to.

- topics: array of 1-3. Choose ONLY from:
  driving, iron play, short game, putting, chipping, pitching, bunker, course management, mental game, fitness, rules, equipment, grip, stance, swing

- quality_score: 1-10

- ai_summary: 2-3 specific sentences. Mention exact problem solved, technique taught, who it is for. Use golf terms. No generic summaries.

- Return ONLY the JSON, nothing else`

export async function GET() {
  try {
    // Use RPC to get unscored videos directly - much faster than two queries
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, description, channel_name')
      .not('id', 'in', `(select video_id from video_metadata)`)
      .limit(3)

    if (error) {
      // Fallback if the subquery syntax doesn't work
      console.error('Query error:', error)
      throw error
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ success: true, message: 'All videos are scored!' })
    }

    let totalScored = 0

    for (const video of videos) {
      const prompt = PROMPT_TEMPLATE(
        video.title || '',
        video.channel_name || '',
        video.description || ''
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
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const claudeData = await response.json()
      const text = claudeData.content?.[0]?.text
      if (!text) continue

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

    // Get remaining count
    const { count } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .not('id', 'in', `(select video_id from video_metadata)`)

    return NextResponse.json({
      success: true,
      message: `Scored ${totalScored} videos. ${count ?? '?'} still remaining.`
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}