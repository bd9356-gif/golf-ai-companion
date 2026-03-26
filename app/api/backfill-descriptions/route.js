import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function cleanDescription(text, title) {
  if (!text) return title || ''

  const lines = text.split('\n')
  const cleanLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (
      !trimmed ||
      trimmed.startsWith('http') ||
      trimmed.startsWith('#') ||           // hashtag lines
      /^[@＠]/.test(trimmed) ||            // @mentions
      /instagram|twitter|facebook|tiktok|spotify|podcast|subscribe|follow|patreon|merch|shop|buy|book|hire|email|contact|website|youtube\.com\/channel|bit\.ly|amzn\.to|linktr/i.test(trimmed) ||
      /---+|\.\.\.\./.test(trimmed) ||     // dividers or dot separators
      /[✅🔔📱💻🎧➡️👉🤜🤛]/u.test(trimmed) ||
      /turn (on|off) notifications/i.test(trimmed) ||
      /credit:|📹|🎥/i.test(trimmed) ||
      // Lines that are mostly hashtags
      (trimmed.match(/#\w+/g) || []).length > 2
    ) continue

    cleanLines.push(trimmed)
  }

  const cleaned = cleanLines.join(' ').trim()

  // If very little useful text remains, fall back to title
  if (cleaned.length < 40) {
    return title || cleaned || text.substring(0, 150)
  }

  return cleaned
}

export async function GET() {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, youtube_video_id, description')
      .like('description', '%...')
      .limit(50)

    if (error) throw error
    if (!videos || videos.length === 0) {
      return NextResponse.json({ success: true, message: 'No truncated descriptions found — all done!' })
    }

    const ids = videos.map(v => v.youtube_video_id).join(',')
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${process.env.YOUTUBE_API_KEY}`
    )
    const data = await response.json()

    if (!data.items) {
      return NextResponse.json({ success: false, error: 'YouTube API returned no items' })
    }

    const descMap = {}
    for (const item of data.items) {
      descMap[item.id] = item.snippet.description
    }

    let totalUpdated = 0
    for (const video of videos) {
      const rawDesc = descMap[video.youtube_video_id]
      if (!rawDesc) continue

      const cleaned = cleanDescription(rawDesc, video.title)
      if (cleaned === video.description) continue

      const { error: updateError } = await supabase
        .from('videos')
        .update({ description: cleaned })
        .eq('id', video.id)

      if (!updateError) totalUpdated++
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${totalUpdated} of ${videos.length} videos. Run again to continue.`
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}