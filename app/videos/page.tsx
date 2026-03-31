'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import AskCompanionTab from '@/components/AskCompanionTab'
import PreviewMode from '@/components/PreviewMode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type VideoRow = {
  id: string
  title: string
  url: string
  thumbnail_url: string
  youtube_video_id: string
  channel_name: string
  description: string
  published_at: string
  video_metadata: any
}

type Tab = 'videos' | 'ask'

export default function Home() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [filtered, setFiltered] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(10)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('videos')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'ask') setActiveTab('ask')
  }, [])

  useEffect(() => {
    fetchVideos()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        const { data } = await supabase.from('saved_videos').select('video_id').eq('user_id', session.user.id)
        if (data) setSavedIds(new Set(data.map((s: any) => s.video_id)))
      }
    })
  }, [])
  useEffect(() => { applyFilters() }, [videos, search])

  async function fetchVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id, title, url, thumbnail_url, youtube_video_id, channel_name, description, published_at,
        video_metadata!video_metadata_video_id_fkey (
          skill_tiers, topics, ai_summary, quality_score
        )
      `)
      .order('published_at', { ascending: false })
    if (!error && data) {
      setVideos([...data].sort(() => Math.random() - 0.5) as unknown as VideoRow[])
    }
    setLoading(false)
  }

  function getMeta(video: VideoRow) {
    const m = video.video_metadata
    if (!m) return null
    return Array.isArray(m) ? m[0] ?? null : m
  }

  function applyFilters() {
    let result = [...videos]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((v) => {
        const meta = getMeta(v)
        return (
          v.title?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          meta?.ai_summary?.toLowerCase().includes(q) ||
          meta?.topics?.some((t: string) => t.toLowerCase().includes(q)) ||
          v.channel_name?.toLowerCase().includes(q)
        )
      })
    }
    setFiltered(result)
    setShowCount(10)
  }

  async function toggleSaved(videoId: string) {
    if (!user) { setPreviewVideoId(videoId); return }
    const isSaved = savedIds.has(videoId)
    if (isSaved) {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
      setSavedIds(prev => { const next = new Set(prev); next.delete(videoId); return next })
    } else {
      await supabase.from('saved_videos').insert({ user_id: user.id, video_id: videoId })
      setSavedIds(prev => new Set([...prev, videoId]))
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getYouTubeId(video: VideoRow): string | null {
    if (video.youtube_video_id) return video.youtube_video_id
    const match = video.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const visibleVideos = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
              ⛳ MyGolf Companion
            </h1>
            <p className="text-base text-gray-500 mt-1">Your AI guide to better golf · <a href="/library" className="text-green-700 font-semibold hover:underline">MyBag</a></p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.location.href='/welcome'}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2"
            >
              ← Back
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'videos' ? 'text-green-800 border-green-700' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              MyVideos
            </button>
            <a
              href="/learn"
              className="px-3 py-2 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition-colors"
            >
              MyGuides
            </a>
            <button
              onClick={() => setActiveTab('ask')}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'ask' ? 'text-green-800 border-green-700' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              MyPro
            </button>
            <div className="ml-auto">
              <a
                href="/plan"
                className="text-sm font-semibold text-green-700 border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50 transition-colors whitespace-nowrap"
              >
                MyGolf Plan
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'ask' ? (
          <AskCompanionTab skillLevel="all" onBack={() => setActiveTab('videos')} />
        ) : (
          <>
            <div className="relative mb-5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by problem or topic…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {!loading && (
              <p className="text-lg font-bold text-gray-800 mb-5">
                Showing {Math.min(showCount, filtered.length)} of {filtered.length} videos
              </p>
            )}

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleVideos.map((video) => {
                  const ytId = getYouTubeId(video)
                  const isPlaying = playingId === video.id
                  const isExpanded = expandedIds.has(video.id)
                  const meta = getMeta(video)
                  const summary: string = meta?.ai_summary ?? ''

                  return (
                    <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                      {isPlaying && ytId && (
                        <div className="relative w-full aspect-video bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                          <button
                            onClick={() => setPlayingId(null)}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {!isPlaying && ytId && (
                        <button
                          onClick={() => setPlayingId(video.id)}
                          className="w-full relative block group"
                          aria-label={`Play ${video.title}`}
                        >
                          <img
                            src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                            alt={video.title}
                            className="w-full object-cover h-48 sm:h-56"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-800 ml-0.5" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base leading-snug">
                              {video.title}
                            </h3>
                            {video.channel_name && (
                              <p className="text-sm text-gray-500 mt-1">{video.channel_name}</p>
                            )}
                          </div>
                          {!isPlaying && (
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-400 hover:text-gray-600 shrink-0"
                              title="Open on YouTube"
                            >
                              ↗
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => toggleExpanded(video.id)}
                          className="mt-2 text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
                        >
                          {isExpanded ? 'Hide Details ▲' : 'See Details ▼'}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            {previewVideoId === video.id ? (
                              <PreviewMode feature="Personalized video details" />
                            ) : (
                              <p className="text-sm text-gray-500">Sign in to see AI summaries and personalized insights.</p>
                            )}
                          </div>
                          </div>
                    </div>
                  )
                })}
              </div>
            )}

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCount((c) => c + 10)}
                  className="px-8 py-3 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 transition-colors"
                >
                  Show More ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">⛳</p>
                <p className="text-gray-600 font-semibold text-lg">No videos found</p>
                <p className="text-base text-gray-400 mt-1">Try a different search term</p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-4 text-base text-green-700 hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}


