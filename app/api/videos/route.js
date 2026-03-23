import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') || 'all'
    const keywords = searchParams.get('keywords') || ''

    if (keywords.trim()) {
      const searchQuery = keywords.trim().split(' ').filter(w => w.length > 2).join(' | ')
      if (searchQuery) {
        const { data: metaData } = await supabase
          .from('video_metadata')
          .select('video_id')
          .textSearch('search_vector', searchQuery)
          .limit(50)

        if (metaData?.length > 0) {
          const videoIds = metaData.map(m => m.video_id)
          const { data, error } = await supabase
            .from('videos')
            .select(`id, title, url, thumbnail_url, channel_name, video_metadata (skill_tiers, topics, ai_summary, quality_score)`)
            .in('id', videoIds)
            .limit(24)

          if (error) return NextResponse.json({ error: error.message }, { status: 500 })

          let filtered = data.filter(v => v.video_metadata?.length > 0)
          if (tier !== 'all') filtered = filtered.filter(v => v.video_metadata[0]?.skill_tiers?.includes(tier))
          return NextResponse.json({ videos: filtered })
        }
        return NextResponse.json({ videos: [] })
      }
    }

    const { data, error } = await supabase
      .from('videos')
      .select(`id, title, url, thumbnail_url, channel_name, video_metadata (skill_tiers, topics, ai_summary, quality_score)`)
      .not('video_metadata', 'is', null)
      .limit(24)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let filtered = data.filter(v => v.video_metadata?.length > 0)
    if (tier !== 'all') filtered = filtered.filter(v => v.video_metadata[0]?.skill_tiers?.includes(tier))

    return NextResponse.json({ videos: filtered })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}