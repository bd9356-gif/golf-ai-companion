'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
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

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Swing Tips', value: 'swing' },
  { label: 'Putting', value: 'putting' },
  { label: 'Short Game', value: 'short game' },
  { label: 'Course Management', value: 'course management' },
  { label: 'Mental Game', value: 'mental game' },
  { label: 'Fitness', value: 'fitness' },
]

export default function GolfTVPage() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [filtered, setFiltered] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(12)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')

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

  useEffect(() => { applyFilters() }, [videos, search, selectedCategory])

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
    if (!error && data) setVideos(data as VideoRow[])
    setLoading(false)
  }

  function applyFilters() {
    let result = [...videos]
    if (search.trim()) {
      const s = search.toLowerCase()
      result = result.filter((v) => v.title?.toLowerCase().includes(s) || v.channel_name?.toLowerCase().includes(s))
    }
    if (selectedCategory) {
      result = result.filter((v) => {
        const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
        const topics = (meta?.topics ?? []).map((t: string) => t.toLowerCase())
        return topics.some((t: string) => t.includes(selectedCategory))
      })
    }
    setFiltered(result)
  }

  async function ensureUnsortedLeafId(userId: string): Promise<string | null> {
    const { data: existing } = await supabase
      .from('focus_leaves')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Unsorted')
      .maybeSingle()
    if ((existing as any)?.id) return (existing as any).id
    const { data: created } = await supabase
      .from('focus_leaves')
      .insert({ user_id: userId, name: 'Unsorted', position: 9999 })
      .select('id')
      .single()
    return (created as any)?.id ?? null
  }

  async function toggleSaved(videoId: string) {
    if (!user) { setPreviewVideoId(videoId); return }
    const isSaved = savedIds.has(videoId)
    if (isSaved) {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
      await supabase.from('leaf_items').delete()
        .eq('user_id', user.id).eq('item_type', 'video').eq('item_id', String(videoId))
      setSavedIds(prev => { const next = new Set(prev); next.delete(videoId); return next })
    } else {
      await supabase.from('saved_videos').insert({ user_id: user.id, video_id: videoId })
      const leafId = await ensureUnsortedLeafId(user.id)
      if (leafId) {
        const { data: maxRow } = await supabase
          .from('leaf_items')
          .select('position')
          .eq('leaf_id', leafId)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle()
        const nextPos = ((maxRow as any)?.position ?? -1) + 1
        await supabase.from('leaf_items').upsert(
          { leaf_id: leafId, user_id: user.id, item_type: 'video', item_id: String(videoId), position: nextPos },
          { onConflict: 'leaf_id,item_type,item_id', ignoreDuplicates: true }
        )
      }
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
        <div className="max-w-6xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">📺 Golf TV</h1>
              <p className="text-sm text-gray-500 mt-1">Your Netflix for golf — browse every instruction video, no level filter.</p>
            </div>
            <a href="/bag" className="text-green-700 text-sm font-semibold hover:underline flex items-center gap-1 whitespace-nowrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="7" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 4L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 7H18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Your Bag
            </a>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => window.location.href='/clubhouse'} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</button>
            <span className="px-3 py-2 text-sm font-semibold border-b-2 text-green-800 border-green-700">
              Golf TV
            </span>
            <a href="/guides" className="px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors">
              Guides
            </a>
            <a href="/club-pro" className="px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors">
              Club Pro
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">All Videos</h2>
          <p className="text-gray-500 text-sm">{filtered.length} videos · No level filter — browse it all</p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search across the full library..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat.value ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📺</p>
            <p className="text-gray-600 font-semibold text-lg">No videos found</p>
            <button onClick={() => { setSearch(''); setSelectedCategory('') }} className="mt-4 text-green-700 hover:underline text-sm font-semibold">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleVideos.map((video) => {
              const ytId = getYouTubeId(video)
              const isPlaying = playingId === video.id
              const isExpanded = expandedIds.has(video.id)
              const isSaved = savedIds.has(video.id)
              const meta = Array.isArray(video.video_metadata) ? video.video_metadata[0] : video.video_metadata
              const summary = meta?.ai_summary ?? ''

              return (
                <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors flex flex-col">
                  {isPlaying && ytId && (
                    <div className="relative w-full aspect-video bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button onClick={() => setPlayingId(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80">✕</button>
                    </div>
                  )}
                  {!isPlaying && ytId && (
                    <button onClick={() => setPlayingId(video.id)} className="w-full relative block group" aria-label={`Play ${video.title}`}>
                      <img
                        src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full object-cover aspect-video"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </button>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{video.title}</h3>
                    {video.channel_name && (
                      <p className="text-xs text-gray-400 mt-1">{video.channel_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-auto pt-3">
                      <button
                        onClick={() => toggleExpanded(video.id)}
                        className="text-xs text-green-700 hover:text-green-900 font-medium transition-colors"
                      >
                        {isExpanded ? 'Hide ▲' : 'Details ▼'}
                      </button>
                      <button
                        onClick={() => toggleSaved(video.id)}
                        className={`text-xs font-semibold transition-colors ml-auto ${isSaved ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {isSaved ? '🔖 Saved' : '🔖 Add to Bag'}
                      </button>
                    </div>
                    {previewVideoId === video.id && !user && (
                      <PreviewMode feature="Saving and personalized features" />
                    )}
                    {isExpanded && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        {user ? (
                          summary ? (
                            <p className="text-xs text-gray-600 leading-relaxed">{summary}</p>
                          ) : (
                            <p className="text-xs text-gray-400">No summary available for this video.</p>
                          )
                        ) : (
                          <PreviewMode feature="AI video summaries" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowCount((c) => c + 12)}
              className="px-8 py-3 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 transition-colors"
            >
              Show More ({filtered.length - showCount} remaining)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
