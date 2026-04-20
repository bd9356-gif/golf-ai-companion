import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route: use the service role key so we can read videos
// regardless of RLS. Never expose this key to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bd9356@gmail.com'

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

  const { data, error } = await supabase
    .from('videos')
    .select(`
      id, title, channel_name, thumbnail_url, youtube_video_id,
      primary_bucket, editorial_status, is_featured,
      video_metadata!video_metadata_video_id_fkey (
        ai_summary, quality_score, quality_reason, sub_tags
      )
    `)
    .eq('editorial_status', 'starter')
    .not('primary_bucket', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videos: data || [] })
}
