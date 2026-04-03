'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import AskCompanionTab from '@/components/AskCompanionTab'
import SkillBanner from '@/components/SkillBanner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const TIER_LABELS = {
  beginner: 'Beginner',
  building_game: 'Building Your Game',
  building_consistency: 'Building Consistency',
  improving_player: 'Improving Player',
  advanced_player: 'Advanced Player',
  senior_player: 'Senior Player',
}

const TIER_TOPICS = {
  beginner: ['swing', 'grip', 'stance', 'putting', 'chipping'],
  building_game: ['swing', 'driving', 'chipping', 'putting', 'course management'],
  building_consistency: ['iron play', 'driving', 'short game', 'putting', 'mental game'],
  improving_player: ['iron play', 'short game', 'bunker', 'course management', 'mental game'],
  advanced_player: ['driving', 'iron play', 'short game', 'bunker', 'course management'],
  senior_player: ['swing', 'fitness', 'course management', 'mental game', 'putting'],
}

export default function MyPlanPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [skillLevel, setSkillLevel] = useState('')
  const [showCount, setShowCount] = useState(10)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [playingId, setPlayingId] = useState(null)
  const [activeTab, setActiveTab] = useState('videos')
  const [savedIds, setSavedIds] = useState(new Set())
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const level = localStorage.getItem('golf_skill_level')
      if (!level || !TIER_LABELS[level]) { router.push('/onboarding'); return }
      setSkillLevel(level)
      const { data: saved } = await supabase.from('saved_videos').select('video_id').eq('user_id', session.user.id)
      if (saved) setSavedIds(new Set(saved.map(s => s.video_id)))
      fetchPlanVideos(level)
      const tabParam = new URLSearchParams(window.location.search).get('tab')
      if (tabParam === 'ask') setActiveTab('ask')
    }
    init()
  }, [])

  async function fetchPlanVideos(level) {
    setLoading(true)
    const topics = TIER_TOPICS[level] ?? []
    const { data, error } = await supabase.from('videos').select(`
      id, title, url, thumbnail_url, youtube_video_id, channel_name, description, published_at,
      video_metadata!video_metadata_video_id_fkey ( skill_tiers, topics, ai_summary, quality_score )
    `)
    if (!error && data) {
      const matched = data.filter(v => {
        const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
        const vTiers = meta?.skill_tiers ?? []
        const vTopics = (meta?.topics ?? []).map(t => t.toLowerCase())
        return vTiers.includes(level) && topics.some(t => vTopics.includes(t.toLowerCase()))
      })
      const sorted = matched.sort((a, b) => {
        const aMeta = Array.isArray(a.video_metadata) ? a.video_metadata[0] : a.video_metadata
        const bMeta = Array.isArray(b.video_metadata) ? b.video_metadata[0] : b.video_metadata
        return (bMeta?.quality_score ?? 0) - (aMeta?.quality_score ?? 0)
      })
      setVideos(sorted.slice(0, 50).sort(() => Math.random() - 0.5))
    }
    setLoading(false)
  }

  async function toggleSaved(videoId) {
    if (!user) return
    const isSaved = savedIds.has(videoId)
    if (isSaved) {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
      setSavedIds(prev => { const next = new Set(prev); next.delete(videoId); return next })
    } else {
      await supabase.from('saved_videos').insert({ user_id: user.id, video_id: videoId, skill_level: skillLevel })
      setSavedIds(prev => new Set([...prev, videoId]))
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function getMeta(video) {
    const m = video.video_metadata
    if (!m) return null
    return Array.isArray(m) ? m[0] ?? null : m
  }

  function getYouTubeId(video) {
    if (video.youtube_video_id) return video.youtube_video_id
    const match = video.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  function toggleExpanded(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const visibleVideos = videos.slice(0, showCount)
  const hasMore = videos.length > showCount
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Golfer'

  if (!skillLevel) return null

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                ⛳ MyGolf Companion
              </h1>
              <p className="text-base text-gray-500 mt-1">Your AI guide to better golf · <a href="/library" className="text-green-700 font-semibold hover:underline"><img src="/bag-icon.svg" width="20" height="20" style={{display:"inline",verticalAlign:"middle",marginRight:"3px"}} alt="MyBag" />MyBag</a></p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/profile" className="text-sm text-gray-500 hover:text-gray-700 font-medium">👤 {userName}</a>
              <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a href="/welcome" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</a>
            <button onClick={() => setActiveTab('videos')} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'videos' ? 'text-green-800 border-green-700' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              MyVideos
            </button>
            <a href="/learn" className="px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors">MyGuides</a>
            <button onClick={() => setActiveTab('ask')} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'ask' ? 'text-green-800 border-green-700' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              MyPro
            </button>
            <div className="ml-auto">
              <a href="/onboarding" className="text-sm font-semibold text-green-700 border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50 transition-colors whitespace-nowrap">MyLevel</a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'ask' ? (
          user ? (
            <AskCompanionTab skillLevel={skillLevel} onBack={() => setActiveTab('videos')} />
          ) : (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">🎓</p>
              <p className="text-gray-900 font-bold text-xl mb-2">Meet Your Club Pro</p>
              <p className="text-gray-500 mb-6">Get personalized AI guidance for your game — sign in to start a conversation with MyPro.</p>
              <a href="/login" className="inline-block px-8 py-3 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-colors">Sign In to Ask MyPro</a>
            </div>
          )
        ) : (
          <>
            <SkillBanner skillLevel={skillLevel} context="videos" count={savedIds.size} />
            {!loading && (
              <p className="text-lg font-bold text-gray-800 mb-5">
                Showing {Math.min(showCount, videos.length)} of {videos.length} videos
              </p>
            )}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">⛳</p>
                <p className="text-gray-600 font-semibold text-lg">No videos found for your level yet</p>
                <a href="/" className="mt-4 inline-block text-base text-green-700 hover:underline">Browse all videos →</a>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleVideos.map((video) => {
                  const ytId = getYouTubeId(video)
                  const isPlaying = playingId === video.id
                  const isExpanded = expandedIds.has(video.id)
                  const meta = getMeta(video)
                  const summary = meta?.ai_summary ?? ''
                  const isSaved = savedIds.has(video.id)
                  return (
                    <div key={video.id} className="border border-green-200 rounded-xl overflow-hidden hover:border-green-300 transition-colors">
                      {isPlaying && ytId && (
                        <div className="relative w-full aspect-video bg-black">
                          <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                          <button onClick={() => setPlayingId(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80">✕</button>
                        </div>
                      )}
                      {!isPlaying && ytId && (
                        <button onClick={() => setPlayingId(video.id)} className="w-full relative block group" aria-label={`Play ${video.title}`}>
                          <img src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={video.title} className="w-full object-cover h-48 sm:h-56" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                          </div>
                        </button>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base leading-snug">{video.title}</h3>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">🎯 {TIER_LABELS[skillLevel]}</span>
                              {video.channel_name && <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">{video.channel_name}</span>}
                            </div>
                            {!isPlaying && <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-gray-600" title="Open on YouTube">↗</a>}
                          </div>
                        </div>
                        <button onClick={() => toggleExpanded(video.id)} className="mt-2 text-sm text-green-700 hover:text-green-900 font-medium transition-colors">
                          {isExpanded ? 'Hide Details ▲' : 'See Details ▼'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleSaved(video.id) }} className={`mt-1 ml-4 text-sm font-semibold transition-colors ${isSaved ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}>
                          {isSaved ? '🔖 Saved to MyBag' : '🔖 Save to MyBag'}
                        </button>
                        {isExpanded && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            {summary && <p className="text-base text-gray-600 leading-relaxed">{summary}</p>}
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
                <button onClick={() => setShowCount(c => Math.min(c + 10, videos.length))} className="px-8 py-3 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 transition-colors">
                  Get 10 More Videos →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}