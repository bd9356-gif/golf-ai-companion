'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'bd9356@gmail.com'

const BUCKET_LABEL = {
  all: 'All',
  full_swing: 'Full Swing',
  short_game: 'Short Game',
  putting: 'Putting',
  course_management: 'Course Mgmt',
}
const BUCKET_ORDER = ['all', 'full_swing', 'short_game', 'putting', 'course_management']
const REBUCKET_OPTIONS = ['full_swing', 'short_game', 'putting', 'course_management']

export default function AdminFeaturedPage() {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState(null)
  const [videos, setVideos] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState({})
  const [err, setErr] = useState('')

  // filters
  const [bucket, setBucket] = useState('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

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

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setErr('')
    const params = new URLSearchParams()
    if (bucket !== 'all') params.set('bucket', bucket)
    if (featuredOnly) params.set('featured', 'true')
    if (q) params.set('q', q)
    params.set('limit', '200')
    try {
      const res = await fetch(`/api/admin/approved-list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || 'Failed to load list')
        setVideos([])
        setCount(0)
      } else {
        setVideos(body.videos || [])
        setCount(body.count || 0)
      }
    } catch (e) {
      setErr(e.message || 'Network error')
    }
    setLoading(false)
  }, [token, bucket, featuredOnly, q])

  useEffect(() => {
    if (ready) load()
  }, [ready, load])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300)
    return () => clearTimeout(t)
  }, [qInput])

  async function act(video, action, extra) {
    if (!token) return
    setWorking(w => ({ ...w, [video.id]: action }))
    try {
      const res = await fetch('/api/admin/video-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId: video.id, action, bucket: extra })
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.error || `Action "${action}" failed`)
      } else {
        if (action === 'feature') {
          setVideos(vs => vs.map(v => v.id === video.id ? { ...v, is_featured: true } : v))
        } else if (action === 'unfeature') {
          if (featuredOnly) {
            setVideos(vs => vs.filter(v => v.id !== video.id))
          } else {
            setVideos(vs => vs.map(v => v.id === video.id ? { ...v, is_featured: false } : v))
          }
        } else if (action === 'hide') {
          setVideos(vs => vs.filter(v => v.id !== video.id))
        } else if (action === 'rebucket') {
          if (bucket !== 'all' && extra !== bucket) {
            setVideos(vs => vs.filter(v => v.id !== video.id))
          } else {
            setVideos(vs => vs.map(v => v.id === video.id ? { ...v, primary_bucket: extra } : v))
          }
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
            ★ Featured Curator
          </h1>
          <span className="ml-auto text-sm text-stone-500">
            {loading ? 'Loading…' : `${count} ${count === 1 ? 'video' : 'videos'}`}
          </span>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
          {BUCKET_ORDER.map(b => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              className={`px-3 py-1 rounded-full text-sm border ${
                bucket === b
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
              }`}
            >
              {BUCKET_LABEL[b]}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="rounded"
            />
            ★ only
          </label>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3">
          <input
            type="text"
            placeholder="Search titles…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            style={{ fontSize: '16px' }}
          />
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
            <p className="text-stone-700 font-medium">No matches.</p>
            <p className="text-stone-500 text-sm mt-1">
              Try a different bucket or clear the search.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {videos.map(v => {
            const meta = v._meta
            const pro = v._pro
            const score = meta?.quality_score
            const busy = working[v.id]

            return (
              <div
                key={v.id}
                className={`rounded-2xl border bg-white overflow-hidden ${v.is_featured ? 'border-amber-400 ring-1 ring-amber-200' : 'border-stone-200'}`}
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
                      {v.is_featured && <span className="text-amber-500 mr-1">★</span>}
                      {v.title}
                    </a>
                    <div className="mt-1 text-xs text-stone-500 truncate">
                      {pro?.display_name || v.channel_name}
                      {pro?.pga_certified && <span className="ml-1 text-emerald-700">· PGA</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {BUCKET_LABEL[v.primary_bucket] || v.primary_bucket || '—'}
                      </span>
                      {typeof score === 'number' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                          q={score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-stone-100 px-3 py-2 flex flex-wrap items-center gap-2 bg-stone-50">
                  {v.is_featured ? (
                    <button
                      onClick={() => act(v, 'unfeature')}
                      disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-800 text-sm font-medium hover:bg-stone-300 disabled:opacity-50"
                    >
                      {busy === 'unfeature' ? '…' : '☆ Unfeature'}
                    </button>
                  ) : (
                    <button
                      onClick={() => act(v, 'feature')}
                      disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      {busy === 'feature' ? '…' : '★ Feature'}
                    </button>
                  )}
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
                      {REBUCKET_OPTIONS.map(b => (
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
