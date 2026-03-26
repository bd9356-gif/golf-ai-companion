import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    // Get 50 videos with truncated descriptions (ending in ...)
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, youtube_video_id, description')
      .like('description', '%...')
      .limit(50)

    if (error) throw error
    if (!videos || videos.length === 0) {
      return NextResponse.json({ success: true, message: 'No truncated descriptions found' })
    }

    // Batch the IDs in groups of 50 (YouTube API limit)
    const ids = videos.map(v => v.youtube_video_id).join(',')
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${process.env.YOUTUBE_API_KEY}`
    )
    const data = await response.json()

    if (!data.items) {
      return NextResponse.json({ success: false, error: 'YouTube API returned no items' })
    }

    // Build a map of videoId -> full description
    const descMap = {}
    for (const item of data.items) {
      descMap[item.id] = item.snippet.description
    }

    // Update each video in Supabase
    let totalUpdated = 0
    for (const video of videos) {
      const fullDesc = descMap[video.youtube_video_id]
      if (!fullDesc || fullDesc === video.description) continue

      const { error: updateError } = await supabase
        .from('videos')
        .update({ description: fullDesc })
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