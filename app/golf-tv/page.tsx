'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import PreviewMode from '@/components/PreviewMode'
import SafeYouTube from '@/components/SafeYouTube'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ProRow = {
  id: string
  slug: string
  display_name: string
  website_url: string | null
  is_featured: boolean
  pga_certified: boolean
  status: string
}

type VideoRow = {
  id: string
  title: string
  url: string
  thumbnail_url: string
  youtube_video_id: string
  channel_name: string
  description: string
  published_at: string
  primary_bucket: string | null
  is_featured: boolean
  editorial_status: string
  pro_id: string | null
  video_metadata: any
  pros: ProRow[] | ProRow | null
}

// Short chip labels so all five fit one row on a phone without horizontal
// scroll. Full names still appear in the "X videos in <name>" count below
// (see the map at the bottom of this file where it's used).
const CATEGORIES = [
  { label: 'All',     full: 'All',                value: '' },
  { label: 'Swing',   full: 'Full Swing',         value: 'full_swing' },
  { label: 'Short',   full: 'Short Game',         value: 'short_game' },
  { label: 'Putting', full: 'Putting',            value: 'putting' },
  { label: 'Course',  full: 'Course Management',  value: 'course_management' },
]

export default function GolfTVPage() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [filtered, setFiltered] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // Pagination: each "page" is PAGE_SIZE videos. Clicking Next/Previous
  // REPLACES the current batch instead of appending to it.
  const PAGE_SIZE = 25
  const [pageStart, setPageStart] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  // Search field is hidden behind a 🔍 toggle in the header to keep the
  // chrome compact. We still auto-expand when `search` has text so an active
  // query is never hidden.
  const [searchOpen, setSearchOpen] = useState(false)

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
  // Always start back at page 1 when the user changes search or category,
  // otherwise they could land on an empty last page after narrowing results.
  useEffect(() => { setPageStart(0) }, [search, selectedCategory])

  async function fetchVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id, title, url, thumbnail_url, youtube_video_id, channel_name, description, published_at,
        primary_bucket, is_featured, editorial_status, pro_id,
        video_metadata!video_metadata_video_id_fkey (
          skill_tiers, topics, ai_summary, quality_score
        ),
        pros!videos_pro_id_fkey (
          id, slug, display_name, website_url, is_featured, pga_certified, status
        )
      `)
      .eq('editorial_status', 'approved')

    if (!error && data) {
      // Sort: featured videos first, then quality score desc, then newest
      const sorted = (data as unknown as VideoRow[]).sort((a, b) => {
        if (!!a.is_featured !== !!b.is_featured) return a.is_featured ? -1 : 1
        const qa = getQuality(a)
        const qb = getQuality(b)
        if (qa !== qb) return qb - qa
        return (b.published_at || '').localeCompare(a.published_at || '')
      })
      setVideos(sorted)
    }
    setLoading(false)
  }

  function getQuality(v: VideoRow): number {
    const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
    return Number(meta?.quality_score) || 0
  }

  function applyFilters() {
    let result = [...videos]
    if (search.trim()) {
      const s = search.toLowerCase()
      result = result.filter((v) =>
        v.title?.toLowerCase().includes(s) ||
        v.channel_name?.toLowerCase().includes(s) ||
        getProName(v)?.toLowerCase().includes(s)
      )
    }
    if (selectedCategory) {
      result = result.filter((v) => v.primary_bucket === selectedCategory)
    }
    setFiltered(result)
  }

  function getActivePro(v: VideoRow): ProRow | null {
    const pro = Array.isArray(v.pros) ? (v.pros as any)[0] : v.pros
    return pro && pro.status === 'active' ? pro : null
  }

  function getProName(v: VideoRow): string {
    const pro = getActivePro(v)
    return pro?.display_name || v.channel_name || ''
  }

  async function ensureHoldingBucketId(userId: string): Promise<string | null> {
    const { data: existing } = await supabase
      .from('focus_leaves')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Holding Bucket')
      .maybeSingle()
    if ((existing as any)?.id) return (existing as any).id
    const { data: created } = await supabase
      .from('focus_leaves')
      .insert({ user_id: userId, name: 'Holding Bucket', position: 0 })
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
      const leafId = await ensureHoldingBucketId(user.id)
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

  // Show one page at a time (pageStart → pageStart + PAGE_SIZE).
  const visibleVideos = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const hasNext = filtered.length > pageStart + PAGE_SIZE
  const hasPrev = pageStart > 0
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)

  // Jump back to the top when paging so the new batch is immediately visible.
  function goToPage(next: number) {
    setPageStart(Math.max(0, next))
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed header — locked on scroll (matches Home Courses).
          Right cluster: 🔍 search toggle + 🏌️ MyBag. */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a
            href="/clubhouse"
            className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0"
            aria-label="Back to MyClubhouse"
          >
            ← Clubhouse
          </a>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">📺</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">Golf TV</h1>
              <p className="text-xs text-green-700 font-semibold leading-tight truncate">Instructional video library</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className="text-xl hover:scale-110 transition-transform leading-none"
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              title={searchOpen ? 'Close search' : 'Search'}
            >
              {searchOpen ? '✕' : '🔍'}
            </button>
            <a
              href="/bag"
              className="text-3xl hover:scale-110 transition-transform leading-none"
              aria-label="Your Golf Bag"
              title="Your Golf Bag"
            >
              🏌️
            </a>
          </div>
        </div>
      </header>
      {/* Spacer offsets the fixed header (~60px). */}
      <div className="h-[60px]" aria-hidden="true" />

      {/* Filter bar — sticky below the fixed header. Search input only
          renders when toggled open OR an active query is present, so the
          chrome stays compact but an active filter is never hidden.
          Chips use flex-1 so all five fit one phone row — no scrolling. */}
      <div className="sticky top-[60px] z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 pt-2.5 pb-2">
          {(searchOpen || search) && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the library…"
              autoFocus
              style={{ fontSize: '16px' }}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 mb-2 focus:outline-none focus:border-green-400 transition-colors"
            />
          )}
          <div className="flex gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex-1 px-2 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat.value ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={cat.full}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-4 pb-8">
        {/* Journey hint — orients first-timers on what 'Add to Bag' does.
            Kept intentionally visible every visit; users who know the flow
            just scroll past. Copy uses "The Starter" to match the
            user-facing label in /bag (DB name is still Holding Bucket). */}
        <div className="mb-4 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-xl shrink-0 leading-none mt-0.5" aria-hidden="true">🔖</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-green-900 leading-tight">Where your journey begins</p>
            <p className="text-xs text-green-800 leading-snug mt-0.5">
              Tap <span className="font-semibold">Add to Bag</span> on any video and it lands in <span className="font-semibold">The Starter</span> — the launch pad in <a href="/bag" className="underline font-semibold hover:text-green-900">Your Golf Bag</a> where you sort lessons into skills.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          {filtered.length === 0
            ? '0 videos'
            : `${pageStart + 1}–${pageEnd} of ${filtered.length} ${filtered.length === 1 ? 'video' : 'videos'}`}
          {selectedCategory && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.full}`}
        </p>

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
              const pro = getActivePro(video)
              const proName = pro?.display_name || video.channel_name
              const badged = !!(pro?.is_featured || pro?.pga_certified)

              return (
                <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors flex flex-col">
                  {isPlaying && ytId && (
                    <SafeYouTube videoId={ytId} onClose={() => setPlayingId(null)} />
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
                      {video.is_featured && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide text-white bg-green-700/95 rounded-full px-2 py-0.5 shadow">
                          ★ Featured
                        </span>
                      )}
                    </button>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{video.title}</h3>
                    {proName && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {pro?.website_url ? (
                          <a
                            href={pro.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-500 hover:text-green-700 hover:underline transition-colors"
                          >
                            {proName} ↗
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">{proName}</p>
                        )}
                        {badged && (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 leading-none" title={pro?.pga_certified ? 'PGA-certified instructor' : 'Featured pro'}>
                            Pro
                          </span>
                        )}
                      </div>
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

        {(hasPrev || hasNext) && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {hasPrev && (
              <button
                onClick={() => goToPage(pageStart - PAGE_SIZE)}
                className="px-5 py-3 border-2 border-green-700 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors"
              >
                ← Previous
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => goToPage(pageStart + PAGE_SIZE)}
                className="px-5 py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
              >
                Next {Math.min(PAGE_SIZE, filtered.length - pageStart - PAGE_SIZE)} →
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
