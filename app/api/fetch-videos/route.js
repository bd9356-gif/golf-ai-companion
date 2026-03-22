import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SEARCH_QUERIES = [
  // By instructor
  'Rick Shiels golf lesson',
  'Me and My Golf tips',
  'Danny Maude golf swing',
  'Mark Crossfield golf',
  'Peter Finch golf',
  // Intermediate techniques
  'golf lag and release',
  'golf hip rotation downswing',
  'golf weight transfer drill',
  'golf tempo and rhythm',
  'golf impact position drill',
  // Advanced techniques
  'golf swing plane drill advanced',
  'golf flop shot technique',
  'golf knockdown shot',
  'golf driver distance advanced',
  'golf wedge distance control'
]

export async function GET() {
  try {
    let totalInserted = 0

    for (const query of SEARCH_QUERIES) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${process.env.YOUTUBE_API_KEY}`
      )

      const data = await response.json()

      if (!data.items) continue

      for (const item of data.items) {
        const video = {
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          thumbnail_url: item.snippet.thumbnails.high.url,
          youtube_video_id: item.id.videoId,
          channel_name: item.snippet.channelTitle,
          description: item.snippet.description,
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
