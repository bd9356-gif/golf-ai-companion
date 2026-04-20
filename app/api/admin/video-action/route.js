import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side route: use the service role key so we can write editorial_status
// and related flags regardless of RLS. Never expose this key to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bd9356@gmail.com'
const VALID_BUCKETS = new Set(['full_swing', 'short_game', 'putting', 'course_management'])
const VALID_STATUSES = new Set(['approved', 'starter', 'hidden'])

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

export async function POST(request) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { videoId, action, bucket } = body || {}
  if (!videoId || !action) {
    return NextResponse.json({ error: 'videoId and action are required' }, { status: 400 })
  }

  const update = {}

  switch (action) {
    case 'approve':
      update.editorial_status = 'approved'
      break
    case 'hide':
      update.editorial_status = 'hidden'
      break
    case 'starter':
      update.editorial_status = 'starter'
      break
    case 'feature':
      update.is_featured = true
      // Featuring implies approved so it actually shows up on Golf TV.
      update.editorial_status = 'approved'
      break
    case 'unfeature':
      update.is_featured = false
      break
    case 'rebucket':
      if (!VALID_BUCKETS.has(bucket)) {
        return NextResponse.json({ error: `Invalid bucket. Must be one of: ${[...VALID_BUCKETS].join(', ')}` }, { status: 400 })
      }
      update.primary_bucket = bucket
      break
    case 'set_status':
      if (!VALID_STATUSES.has(bucket)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` }, { status: 400 })
      }
      update.editorial_status = bucket
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('videos')
    .update(update)
    .eq('id', videoId)
    .select('id, editorial_status, primary_bucket, is_featured')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, video: data })
}
