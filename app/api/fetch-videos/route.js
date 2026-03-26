import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SEARCH_QUERIES = [
  // === BEGINNER — Core Swing Basics ===
  'golf swing basics for beginners',
  'simple golf swing explained',
  'beginner golf setup and posture',
  'how to grip a golf club beginner',
  'easy takeaway drill',
  'golf swing arc explained',
  'how to stop topping the ball beginner',
  'how to aim in golf beginner',
  'golf ball position basics',
  'how to read a slope putt beginner',
  // === BEGINNER — Contact & Consistency ===
  'how to hit irons solid beginner',
  'how to stop slicing driver beginner',
  'beginner chipping basics',
  'simple putting setup beginner',
  // === BEGINNER — Short Clear Lessons ===
  'golf swing made simple',
  'golf swing step by step beginner',
  // === INTERMEDIATE — Ball Striking & Compression ===
  'how to compress irons',
  'shallow the club simple drill',
  'stop early extension golf',
  'improve low point control golf',
  'rotate not sway golf swing',
  'lag in golf swing drill',
  'how to stop chunking irons',
  'golf weight transfer drill',
  // === INTERMEDIATE — Sequencing & Power ===
  'golf downswing sequence like pros',
  'lead hip rotation drill',
  'how to start the downswing lower body',
  'golf transition drill simple',
  // === INTERMEDIATE — Wedge & Short Game ===
  'high bounce wedge technique soft sand',
  'bermuda grass chipping technique',
  'tight lie wedge drill',
  'bunker shot vs fairway bunker technique',
  // === INTERMEDIATE — Driver Control ===
  'fix over the top driver',
  'hit driver straighter not harder',
  'driver setup for accuracy',
  // === ADVANCED — Tour Mechanics ===
  'tour level golf swing sequence',
  'pressure shift golf swing force plates explained',
  'pelvis rotation golf swing drill',
  'hand path and shallowing advanced',
  'golf kinematic sequence',
  // === ADVANCED — Speed & Efficiency ===
  'increase clubhead speed without swinging harder',
  'ground reaction forces golf swing',
  'lead wrist flexion bowing drill',
  // === ADVANCED — Shot Shaping ===
  'how to hit a controlled fade',
  'tour draw setup and path',
  'flighted wedge technique',
  'how to hit stinger shot',
  'advanced course management strategy',
  // === ADVANCED — Short Game ===
  'spin wedge technique tour',
  'low launch high spin wedge drill',
  'tight lie lob shot technique'
]

// Fetch full descriptions for a batch of video IDs
async function getFullDescriptions(videoIds) {
  const ids = videoIds.join(',')
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${process.env.YOUTUBE_API_KEY}`
  )
  const data = await response.json()
  const map = {}
  if (data.items) {
    for (const item of data.items) {
      map[item.id] = item.snippet.description
    }
  }
  return map
}

export async function GET() {
  try {
    let totalInserted = 0

    for (const query of SEARCH_QUERIES) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${process.env.YOUTUBE_API_KEY}`
      )
      const data = await response.json()
      if (!data.items) continue

      // Collect all video IDs from this search batch
      const videoIds = data.items.map(item => item.id.videoId)

      // Fetch full descriptions in one call
      const fullDescriptions = await getFullDescriptions(videoIds)

      for (const item of data.items) {
        const videoId = item.id.videoId
        const video = {
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail_url: item.snippet.thumbnails.high.url,
          youtube_video_id: videoId,
          channel_name: item.snippet.channelTitle,
          // Use full description from videos endpoint, fall back to snippet
          description: fullDescriptions[videoId] || item.snippet.description,
          published_at: item.snippet.publishedAt,
        }

        const { error } = await supabase
          .from('videos')
          .upsert(video, { onConflict: 'youtube_video_id' })

        if (!error) totalInserted++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fetched and saved ${totalInserted} videos`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}