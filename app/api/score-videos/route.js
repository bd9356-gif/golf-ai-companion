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
  - "building_consistency" = scoring 90-100, inconsistent fundamentals
  - "improving_player" = scoring 80-90, solid fundamentals, working on scoring
  - "advanced_player" = scoring 70-80, low handicap, shot shaping and strategy

  Include ALL tiers the video genuinely applies to.

- topics: array of 1-3. Choose ONLY from:
  driving, iron play, short game, putting, chipping, pitching, bunker, course management, mental game, fitness, rules, equipment, grip, stance, swing

- quality_score: 1-10

- ai_summary: 2-3 specific sentences. Exact problem solved, technique taught, who it is for. No generic summaries.

- Return ONLY the JSON, nothing else`

export async function GET() {
  try {
    // Step 1: Get scored video IDs in batches
    const scoredIds = new Set()
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('video_metadata')
        .select('video_id')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break
      data.forEach(r => scoredIds.add(r.video_id))
      if (data.length < pageSize) break
      page++
    }

    // Step 2: Find ONE unscored video
    page = 0
    let unscoredVideo = null

    outer: while (true) {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, description, channel_name')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const video of data) {
        if (!scoredIds.has(video.id)) {
          unscoredVideo = video
          break outer
        }
      }

      if (data.length < pageSize) break
      page++
    }

    if (!unscoredVideo) {
      return NextResponse.json({ success: true, message: 'All videos are scored!' })
    }

    const remaining = 715 - scoredIds.size

    // Step 3: Score the single video
    const prompt = PROMPT_TEMPLATE(
      unscoredVideo.title || '',
      unscoredVideo.channel_name || '',
      unscoredVideo.description || ''
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

    if (!text) {
      return NextResponse.json({ success: false, error: 'No response from Claude', remaining })
    }

    let result
    try {
      result = JSON.parse(text)
    } catch {
      return NextResponse.json({ success: false, error: 'JSON parse failed', raw: text, remaining })
    }

    const { error: insertError } = await supabase
      .from('video_metadata')
      .insert({
        video_id: unscoredVideo.id,
        skill_tiers: result.skill_tiers,
        topics: result.topics,
        ai_summary: result.ai_summary,
        quality_score: result.quality_score,
        status: 'approved'
      })

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message, remaining })
    }

    return NextResponse.json({
      success: true,
      message: `Scored: "${unscoredVideo.title}". ${remaining - 1} remaining.`
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}