'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import AskCompanionTab from '@/components/AskCompanionTab'

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

const TIER_SUBLABELS = {
  beginner: 'Just starting, learning the basics',
  building_game: 'Scoring 100+, working on consistency',
  building_consistency: 'Scoring 90–100, improving fundamentals',
  improving_player: 'Scoring 80–90, solid intermediate skills',
  advanced_player: 'Scoring 70–80, low-handicap and scoring well',
  senior_player: 'Prioritizing mobility, rhythm, balance, and joint-friendly mechanics',
}

const TIER_TOPICS = {
  beginner:             ['swing', 'grip', 'stance', 'putting', 'chipping'],
  building_game:        ['swing', 'driving', 'chipping', 'putting', 'course management'],
  building_consistency: ['iron play', 'driving', 'short game', 'putting', 'mental game'],
  improving_player:     ['iron play', 'short game', 'bunker', 'course management', 'mental game'],
  advanced_player:      ['driving', 'iron play', 'short game', 'bunker', 'course management'],
  senior_player:        ['swing', 'fitness', 'course management', 'mental game', 'putting'],
}

export default function PlanPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [skillLevel, setSkillLevel] = useState('')
  const [showCount, setShowCount] = useState(10)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [playingId, setPlayingId] = useState(null)
  const [activeTab, setActiveTab] = useState('videos')
  const [savedIds, setSavedIds] = useState(new Set())
  const [showSaved, setShowSaved] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const level = localStorage.getItem('golf_skill_level')
    if (!level || !TIER_LABELS[level]) {
      router.push('/onboarding')
      return
    }
    setSkillLevel(level)
    const savedRaw = localStorage.getItem('golf_saved_videos')
    if (savedRaw) { try { setSavedIds(new Set(JSON.parse(savedRaw))) } catch {} }
    fetchPlanVideos(level)
  }, [])

  async function fetchPlanVideos(level) {
    setLoading(true)
    const topics = TIER_TOPICS[level] ?? []

    const { data, error } = await supabase
      .from('videos')
      .select(`
        id, title, url, thumbnail_url, youtube_video_id,
        channel_name, description, published_at,
        video_metadata!video_metadata_video_id_fkey (
          skill_tiers, topics, ai_summary, quality_score
        )
      `)

    if (!error && data) {
      // Filter to videos that match this tier AND have matching topics
      const matched = data.filter(v => {
        const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
        const vTiers = meta?.skill_tiers ?? []
        const vTopics = (meta?.topics ?? []).map(t => t.toLowerCase())
        const tierMatch = vTiers.includes(level)
        const topicMatch = topics.some(t => vTopics.includes(t.toLowerCase()))
        return tierMatch && topicMatch
      })

      // Sort by quality score then shuffle for variety
      const sorted = matched.sort((a, b) => {
        const aMeta = Array.isArray(a.video_metadata) ? a.video_metadata[0] : a.video_metadata
        const bMeta = Array.isArray(b.video_metadata) ? b.video_metadata[0] : b.video_metadata
        return (bMeta?.quality_score ?? 0) - (aMeta?.quality_score ?? 0)
      })

      // Take top 50 by quality, then shuffle for rotation
      const top50 = sorted.slice(0, 50)
      const shuffled = top50.sort(() => Math.random() - 0.5)
      setVideos(shuffled)
    }
    setLoading(false)
  }

  function toggleSaved(id) {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('golf_saved_videos', JSON.stringify([...next]))
      return next
    })
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

  const visibleVideos = showSaved ? videos.filter(v => savedIds.has(v.id)) : videos.slice(0, showCount)
  const hasMore = videos.length > showCount

  if (!skillLevel) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
              ⛳ MyGolf Companion
            </h1>
            <p className="text-base text-gray-500 mt-1">Your AI guide to better golf</p>
          </div>
          <div className="flex items-center gap-1">
            <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</a>
            <button
              onClick={() => { setShowSaved(false); setActiveTab('videos') }}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'videos' && !showSaved ? 'text-green-800 border-green-700' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
            >
              Videos
            </button>
            <a href="/learn" className={`px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors`}>
              Articles
            </a>
            <button
              onClick={() => setActiveTab('ask')}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'ask' ? 'text-green-800 border-green-700' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
            >
              Ask AI
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => { setShowSaved(!showSaved); setActiveTab('videos') }}
                className={`text-lg transition-colors ${showSaved ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="Saved videos"
              >
                🔖{savedIds.size > 0 ? ` ${savedIds.size}` : ''}
              </button>
              <a
                href="/onboarding"
                className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors whitespace-nowrap"
              >
                Update My Plan
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'ask' ? (
          <AskCompanionTab skillLevel={skillLevel} onBack={() => setActiveTab('videos')} />
        ) : (
          <>
            {/* Plan header card */}
            <div className="mb-6 p-5 bg-green-50 border border-green-100 rounded-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Your Video Plan</p>
                  <h2 className="text-2xl font-bold text-green-900">{TIER_LABELS[skillLevel]}</h2>
                  <p className="text-green-700 mt-0.5">{TIER_SUBLABELS[skillLevel]}</p>
                </div>

              </div>
              {!loading && (
                <p className="text-sm text-green-700 mt-3 font-medium">
                  {videos.length} videos matched to your level
                </p>
              )}
            </div>

            {/* Result count */}
            {!loading && (
              <p className="text-lg font-bold text-gray-800 mb-5">
                Showing {Math.min(showCount, videos.length)} of {videos.length} videos
              </p>
            )}

            {/* Video list */}
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
                <p className="text-base text-gray-400 mt-1">Check back soon as we add more content</p>
                <a href="/" className="mt-4 inline-block text-base text-green-700 hover:underline">
                  Browse all videos →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleVideos.map((video) => {
                  const ytId = getYouTubeId(video)
                  const isPlaying = playingId === video.id
                  const isExpanded = expandedIds.has(video.id)
                  const meta = getMeta(video)
                  const summary = meta?.ai_summary ?? ''
                  const topics = meta?.topics ?? []

                  return (
                    <div
                      key={video.id}
                      className="border border-green-200 rounded-xl overflow-hidden hover:border-green-300 transition-colors"
                    >
                      {/* Inline video player */}
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

                      {/* Thumbnail */}
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

                      {/* Card info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base leading-snug">
                              {video.title}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                🎯 {TIER_LABELS[skillLevel]}
                              </span>
                              {video.channel_name && (
                                <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">
                                  {video.channel_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => toggleSaved(video.id)}
                              className={`text-2xl transition-colors ${savedIds.has(video.id) ? 'text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                              title={savedIds.has(video.id) ? 'Remove from saved' : 'Save video'}
                            >🔖</button>
                            {!isPlaying && (
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-400 hover:text-gray-600"
                                title="Open on YouTube"
                              >
                                ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* See Details */}
                        <button
                          onClick={() => toggleExpanded(video.id)}
                          className="mt-2 text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
                        >
                          {isExpanded ? 'Hide Details ▲' : 'See Details ▼'}
                        </button>

                        {/* Expandable — AI summary always shown on plan page */}
                        {isExpanded && (
                          <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                            {summary && (
                              <p className="text-base text-gray-600 leading-relaxed">{summary}</p>
                            )}
                            {topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {topics.map((topic) => (
                                  <span
                                    key={topic}
                                    className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Get 10 More */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCount(c => Math.min(c + 10, videos.length))}
                  className="px-8 py-3 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 transition-colors"
                >
                  Get 10 More Videos →
                </button>
                <p className="text-sm text-gray-400 mt-2">{videos.length} videos matched to your level</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}