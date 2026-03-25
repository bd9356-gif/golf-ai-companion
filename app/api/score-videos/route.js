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

Return this exact JSON structure:
{"skill_tiers": ["beginner"], "topics": ["driving"], "ai_summary": "summary here", "quality_score": 7.5}

Rules:

- skill_tiers: array, choose from: beginner, intermediate, advanced. Only include tiers this video is genuinely appropriate for.

- topics: array of 1-3 topics. Choose ONLY from this exact list:
  driving, iron play, short game, putting, chipping, pitching, bunker, course management, mental game, fitness, rules, equipment, grip, stance, swing

  Guidelines:
  - "driving" = driver, tee shots, hitting off the tee, distance off tee
  - "iron play" = iron shots, approach shots, ball striking, hitting irons
  - "short game" = shots inside 100 yards, wedge play general
  - "chipping" = chip shots around the green
  - "pitching" = pitch shots, flop shots
  - "putting" = putting stroke, green reading, lag putting
  - "bunker" = sand shots, bunker play
  - "swing" = ONLY for general full swing mechanics not specific to driver or irons
  - "grip" = ONLY when grip is the primary focus
  - "stance" = ONLY when setup/stance is the primary focus
  - "course management" = strategy, shot selection
  - "mental game" = mindset, focus, pressure
  - "fitness" = physical conditioning for golf
  - "rules" = rules of golf
  - "equipment" = club fitting, gear

  Pick the MOST SPECIFIC topic. Prefer "driving" over "swing" for driver videos.

- quality_score: 1-10 based on how helpful and instructional this looks

- ai_summary: 2-3 sentences, very specific. Mention the exact problem solved, the technique or drill taught, and who it is for. Use specific golf terms. No generic summaries.

- Return ONLY the JSON, nothing else`

export async function GET() {
  try {
    // Step 1: Get all scored video_ids in batches (handles large sets)
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

    // Step 2: Get all video IDs
    const allVideoIds = []
    page = 0

    while (true) {
      const { data, error } = await supabase
        .from('videos')
        .select('id')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      data.forEach(r => allVideoIds.push(r.id))
      if (data.length < pageSize) break
      page++
    }

    // Step 3: Find unscored IDs
    const unscoredIds = allVideoIds.filter(id => !scoredIds.has(id))

    if (unscoredIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${allVideoIds.length} videos are scored. Nothing to do.`
      })
    }

    // Step 4: Fetch details for first 10 unscored videos
    const batch = unscoredIds.slice(0, 10)
    const { data: videos, error: fetchError } = await supabase
      .from('videos')
      .select('id, title, description, channel_name')
      .in('id', batch)

    if (fetchError) throw fetchError

    // Step 5: Score each video
    let totalScored = 0

    for (const video of videos) {
      const prompt = PROMPT_TEMPLATE(
        video.title,
        video.channel_name,
        video.description
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
          max_tokens: 500,
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

    return NextResponse.json({
      success: true,
      message: `Scored ${totalScored} videos. ${unscoredIds.length - totalScored} still remaining.`
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}