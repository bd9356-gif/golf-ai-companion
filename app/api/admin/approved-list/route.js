import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route: use the service role key so we can read videos regardless
// of RLS. Never expose this key to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bd9356@gmail.com'
const VALID_BUCKETS = new Set(['full_swing', 'short_game', 'putting', 'course_management'])

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data } = await supabase.auth.getUser(token)
  const user = data?.user
  if (user?.email === ADMIN_EMAIL) return user
  return null
}

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const bucket = url.searchParams.get('bucket')         // optional — one of VALID_BUCKETS
  const featured = url.searchParams.get('featured')     // 'true' to restrict to is_featured
  const q = (url.searchParams.get('q') || '').trim()    // optional title search
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500)

  let query = supabase
    .from('videos')
    .select(`
      id, title, channel_name, thumbnail_url, youtube_video_id,
      primary_bucket, editorial_status, is_featured, pro_id,
      pros!videos_pro_id_fkey ( id, slug, display_name, website_url, pga_certified, is_featured ),
      video_metadata!video_metadata_video_id_fkey ( ai_summary, quality_score, quality_reason, sub_tags )
    `)
    .eq('editorial_status', 'approved')
    .not('primary_bucket', 'is', null)
    .limit(limit)

  if (bucket && VALID_BUCKETS.has(bucket)) {
    query = query.eq('primary_bucket', bucket)
  }
  if (featured === 'true') {
    query = query.eq('is_featured', true)
  }
  if (q.length > 0) {
    // ilike is case-insensitive — good enough for an admin list.
    query = query.ilike('title', `%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort: featured first, then quality_score desc.
  const rows = (data || []).map(v => {
    const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
    const pro = Array.isArray(v.pros) ? v.pros[0] : v.pros
    return { ...v, _meta: meta, _pro: pro }
  })
  rows.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    const aq = a._meta?.quality_score ?? 0
    const bq = b._meta?.quality_score ?? 0
    return bq - aq
  })

  return NextResponse.json({ videos: rows, count: rows.length })
}
