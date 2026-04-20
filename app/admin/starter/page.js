'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'bd9356@gmail.com'

const BUCKET_LABEL = {
  full_swing: 'Full Swing',
  short_game: 'Short Game',
  putting: 'Putting',
  course_management: 'Course Management',
}
const BUCKETS = Object.keys(BUCKET_LABEL)

export default function AdminStarterPage() {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState({})  // per-video action flag
  const [err, setErr] = useState('')

  // 1. Auth gate
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      const session = data?.session
      if (!session) {
        window.location.href = '/login'
        return
      }
      if (session.user?.email !== ADMIN_EMAIL) {
        window.location.href = '/clubhouse'
        return
      }
      setToken(session.access_token)
      setReady(true)
    })()
  }, [])

  // 2. Load the starter queue
  useEffect(() => {
    if (!ready || !token) return
    loadQueue(token)
  }, [ready, token])

  async function loadQueue(accessToken) {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/admin/starter-queue', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || 'Failed to load queue')
        setVideos([])
      } else {
        // Sort client-side: lowest quality_score first so the judgment calls
        // rise to the top.
        const rows = (body.videos || []).map(v => ({
          ...v,
          _meta: Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
        }))
        rows.sort((a, b) => {
          const aq = a._meta?.quality_score ?? 0
          const bq = b._meta?.quality_score ?? 0
          return aq - bq
        })
        setVideos(rows)
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setLoading(false)
  }

  async function act(video, action, bucket) {
    if (!token) return
    setWorking(w => ({ ...w, [video.id]: action }))
    try {
      const res = await fetch('/api/admin/video-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId: video.id, action, bucket })
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || `Action "${action}" failed`)
      } else {
        // approve / hide / starter -> drop out of the queue
        // rebucket -> update in place
        // feature / unfeature -> update in place
        if (action === 'approve' || action === 'hide' || action === 'starter') {
          setVideos(vs => vs.filter(v => v.id !== video.id))
        } else if (action === 'rebucket') {
          setVideos(vs => vs.map(v => v.id === video.id ? { ...v, primary_bucket: bucket } : v))
        } else if (action === 'feature') {
          setVideos(vs => vs.filter(v => v.id !== video.id))
        } else if (action === 'unfeature') {
          setVideos(vs => vs.map(v => v.id === video.id ? { ...v, is_featured: false } : v))
        }
        setErr('')
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setWorking(w => {
      const { [video.id]: _, ...rest } = w
      return rest
    })
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Checking access…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (window.location.href = '/clubhouse')}
            className="text-stone-500 hover:text-stone-900"
            title="Back"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-stone-900">
            🗂️ Starter Queue
          </h1>
          <span className="ml-auto text-sm text-stone-500">
            {loading ? 'Loading…' : `${videos.length} pending`}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {err && (
          <div className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}

        {!loading && videos.length === 0 && !err && (
          <div className="rounded-2xl border-2 border-stone-200 bg-white p-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-stone-700 font-medium">Inbox zero.</p>
            <p className="text-stone-500 text-sm mt-1">
              No below-threshold videos waiting for review.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {videos.map(v => {
            const meta = v._meta
            const score = meta?.quality_score
            const reason = meta?.quality_reason
            const summary = meta?.ai_summary
            const subTags = Array.isArray(meta?.sub_tags) ? meta.sub_tags : []
            const busy = working[v.id]

            return (
              <div
                key={v.id}
                className="rounded-2xl border border-stone-200 bg-white overflow-hidden"
              >
                <div className="flex gap-3 p-3">
                  {v.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      className="w-32 h-20 object-cover rounded-lg flex-shrink-0 bg-stone-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block font-medium text-stone-900 hover:text-orange-600 line-clamp-2"
                    >
                      {v.title}
                    </a>
                    <div className="mt-1 text-xs text-stone-500 truncate">
                      {v.channel_name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {BUCKET_LABEL[v.primary_bucket] || v.primary_bucket || '—'}
                      </span>
                      {typeof score === 'number' && (
                        <span className={`px-2 py-0.5 rounded-full ${score >= 6 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          q={score}
                        </span>
                      )}
                      {v.is_featured && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          ★ featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(reason || summary) && (
                  <div className="px-3 pb-3 text-sm text-stone-700 space-y-1">
                    {reason && <p className="italic text-stone-500">&ldquo;{reason}&rdquo;</p>}
                    {summary && <p>{summary}</p>}
                    {subTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {subTags.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-stone-100 px-3 py-2 flex flex-wrap items-center gap-2 bg-stone-50">
                  <button
                    onClick={() => act(v, 'approve')}
                    disabled={!!busy}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === 'approve' ? '…' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => act(v, 'feature')}
                    disabled={!!busy}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                    title="Approve AND feature"
                  >
                    {busy === 'feature' ? '…' : '★ Feature'}
                  </button>
                  <button
                    onClick={() => act(v, 'hide')}
                    disabled={!!busy}
                    className="px-3 py-1.5 rounded-lg bg-stone-700 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
                  >
                    {busy === 'hide' ? '…' : '🗑 Hide'}
                  </button>

                  <div className="ml-auto flex items-center gap-1 text-sm">
                    <span className="text-stone-500">Bucket:</span>
                    <select
                      value={v.primary_bucket || ''}
                      onChange={(e) => act(v, 'rebucket', e.target.value)}
                      disabled={!!busy}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
                    >
                      {BUCKETS.map(b => (
                        <option key={b} value={b}>{BUCKET_LABEL[b]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
