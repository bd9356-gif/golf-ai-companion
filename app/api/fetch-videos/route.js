import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route: use the service role key so we can write pro_id etc.
// regardless of RLS. Never expose this key to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  'tight lie lob shot technique',
  // === SENIOR — Swing & Mobility ===
  'golf swing tips for seniors',
  'senior golf swing made easy',
  'golf swing for older players',
  'senior golf driver tips',
  'golf swing with limited flexibility seniors',
  'effortless golf swing for seniors',
  'senior golf swing turn drill',
  'golf swing for bad back seniors',
  'slow swing speed golf tips',
  // === SENIOR — Short Game & Scoring ===
  'senior golf short game tips',
  'senior golf putting tips',
  'senior golf chipping tips',
  'golf course management for seniors',
  // === SENIOR — Fitness & Mobility ===
  'golf flexibility exercises for seniors',
  'senior golfer hip rotation exercise',
  'golf fitness over 60',
  'golf warmup routine for seniors',
  'golf stretches for older players',
  // === SENIOR — General ===
  'golf tips for players over 60',
  'golf for players over 70',
  'senior golf lessons',
  'golf tips for arthritic hands',
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

// Build a case-insensitive map of youtube_channel_name -> pro_id so every
// new ingest auto-attributes to a known pro without a manual seed-pros run.
async function buildProIdMap() {
  const { data, error } = await supabase
    .from('pros')
    .select('id, youtube_channel_name')
    .not('youtube_channel_name', 'is', null)

  const map = new Map()
  if (error || !data) return map
  for (const p of data) {
    const key = (p.youtube_channel_name || '').trim().toLowerCase()
    if (key) map.set(key, p.id)
  }
  return map
}

export async function GET() {
  try {
    let totalInserted = 0
    let totalLinked = 0

    const proIdByChannel = await buildProIdMap()

    for (const query of SEARCH_QUERIES) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${process.env.YOUTUBE_API_KEY}`
      )
      const data = await response.json()
      if (!data.items) continue

      const videoIds = data.items.map(item => item.id.videoId)
      const fullDescriptions = await getFullDescriptions(videoIds)

      for (const item of data.items) {
        const videoId = item.id.videoId
        const channelName = item.snippet.channelTitle || ''
        const proId = proIdByChannel.get(channelName.trim().toLowerCase()) || null

        const video = {
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail_url: item.snippet.thumbnails.high.url,
          youtube_video_id: videoId,
          channel_name: channelName,
          description: fullDescriptions[videoId] || item.snippet.description,
          published_at: item.snippet.publishedAt,
          pro_id: proId,
          // Note: editorial_status is intentionally NOT set here. For new
          // rows it picks up the schema default ('starter'). For existing
          // rows on re-fetch, Supabase upsert only writes the columns in
          // this payload, so an already-'approved' video stays approved.
        }

        const { error } = await supabase
          .from('videos')
          .upsert(video, { onConflict: 'youtube_video_id' })

        if (!error) {
          totalInserted++
          if (proId) totalLinked++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fetched and saved ${totalInserted} videos (${totalLinked} auto-linked to a pro)`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}