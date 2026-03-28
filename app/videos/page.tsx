'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import AskCompanionTab from '@/components/AskCompanionTab'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIER_LABELS: Record<string, string> = {
  all: 'All Levels',
  beginner: 'Beginner',
  building_game: 'Building Your Game',
  building_consistency: 'Building Consistency',
  improving_player: 'Improving Player',
  advanced_player: 'Advanced Player',
  senior_player: 'Senior Player',
}

const TIER_SUBLABELS: Record<string, string> = {
  all: '',
  beginner: 'Just starting, learning the basics',
  building_game: 'Scoring 100+',
  building_consistency: 'Scoring 90–100',
  improving_player: 'Scoring 80–90',
  advanced_player: 'Scoring 70–80',
  senior_player: 'Mobility, rhythm & joint-friendly mechanics',
}

const TIER_VALUES = ['all', 'beginner', 'building_game', 'building_consistency', 'improving_player', 'advanced_player', 'senior_player']

// Maps skill tier to relevant topics for video filtering
const TIER_TOPICS: Record<string, string[]> = {
  beginner:             ['swing', 'grip', 'stance', 'putting', 'chipping'],
  building_game:        ['swing', 'driving', 'chipping', 'putting', 'course management'],
  building_consistency: ['iron play', 'driving', 'short game', 'putting', 'mental game'],
  improving_player:     ['iron play', 'short game', 'bunker', 'course management', 'mental game'],
  advanced_player:      ['driving', 'iron play', 'short game', 'bunker', 'course management'],
  senior_player:        ['swing', 'fitness', 'course management', 'mental game', 'putting'],
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
  video_metadata: any
}

type Tab = 'videos' | 'ask'

export default function Home() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [filtered, setFiltered] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [skillFilter, setSkillFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(10)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('videos')
  const [assessmentTopics, setAssessmentTopics] = useState<string[]>([])
  const [matchedPool, setMatchedPool] = useState<VideoRow[]>([])
  const [planPage, setPlanPage] = useState(0)

  useEffect(() => {
    // Check URL for skill level set by onboarding
    const params = new URLSearchParams(window.location.search)
    const levelFromUrl = params.get('level')
    if (levelFromUrl && TIER_VALUES.includes(levelFromUrl)) {
      setSkillFilter(levelFromUrl)
      // Clean the URL without reloading
      window.history.replaceState({}, '', '/')
    }

    // Load topics from assessment — stored directly by onboarding page
    const topicsRaw = localStorage.getItem('golf_topics')
    if (topicsRaw) {
      try {
        const topics = JSON.parse(topicsRaw)
        if (Array.isArray(topics) && topics.length > 0) {
          setAssessmentTopics(topics)
        }
      } catch {}
    }
  }, [])

  useEffect(() => { fetchVideos() }, [])
  useEffect(() => { applyFilters() }, [videos, skillFilter, search, assessmentTopics])

  async function fetchVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id, title, url, thumbnail_url, youtube_video_id,
        channel_name, description, published_at,
        video_metadata!video_metadata_video_id_fkey (
          skill_tiers, topics, ai_summary, quality_score
        )
      `)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
    } else if (data) {
      // Shuffle randomly so the opening 10 rotate on every load
      const shuffled = [...data].sort(() => Math.random() - 0.5) as unknown as VideoRow[]
      setVideos(shuffled)
    }
    setLoading(false)
  }

  function getMeta(video: VideoRow) {
    const m = video.video_metadata
    if (!m) return null
    return Array.isArray(m) ? m[0] ?? null : m
  }

  function videoMatchesTopics(video: VideoRow, keywords: string[]): boolean {
    if (keywords.length === 0) return false
    const meta = getMeta(video)
    const vTopics: string[] = (meta?.topics ?? []).map((t: string) => t.toLowerCase())
    // Use exact topic match since topics are controlled vocabulary
    return keywords.some((kw) => vTopics.includes(kw.toLowerCase()))
  }

  function applyFilters() {
    let result = [...videos]

    // Skill tier filter
    if (skillFilter !== 'all') {
      result = result.filter((v) => {
        const tiers = getMeta(v)?.skill_tiers
        return tiers?.includes(skillFilter) ?? false
      })
    }

    // Search filter
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
    } else if (assessmentTopics.length > 0) {
      // Exact keyword match only — build a pool, show 10 at a time
      const exactMatches = result.filter((v) => videoMatchesTopics(v, assessmentTopics))
      if (exactMatches.length > 0) {
        const shuffled = exactMatches.sort(() => Math.random() - 0.5)
        setMatchedPool(shuffled)
        result = shuffled
      }
      // If no exact matches found, fall through to show all (shuffled)
    }
    // Always shuffle so the opening 10 rotate

    setFiltered(result)
    setShowCount(10)
    setPlanPage(0)
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

  // Human-readable label for assessment focus
  const focusLabel = [...new Set(assessmentTopics)].join(', ')

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          {/* Branding row */}
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
              ⛳ MyGolf Companion
            </h1>
            <p className="text-base text-gray-500 mt-1">Your AI guide to better golf</p>
          </div>

          {/* Nav row — tabs + Get My Video Plan together */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'videos'
                  ? 'text-green-800 border-green-700'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Video Library
            </button>
            <a
              href="/learn"
              className="px-4 py-2 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition-colors"
            >
              Learn
            </a>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ask')}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-700 rounded-xl hover:bg-green-800 transition-colors whitespace-nowrap"
              >
                Ask MyGolf AI
              </button>
              <a
                href="/onboarding"
                className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors whitespace-nowrap"
              >
                Get My Video Plan
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'ask' ? (
          <AskCompanionTab skillLevel={skillFilter} onBack={() => setActiveTab('videos')} />
                <button
                  onClick={() => {
                    setAssessmentTopics([])
                    localStorage.removeItem('golf_topics')
                    localStorage.removeItem('golf_answers')
                  }}
                  className="text-xs text-green-600 hover:text-green-800 ml-3 whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            )}



            {/* Search */}
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

            {/* Result count — prominent */}
            {!loading && (
              <div className="mb-5">
                <p className="text-lg font-bold text-gray-800">
                  {filtered.length === 0
                    ? 'No videos found'
                    : assessmentTopics.length > 0 && matchedPool.length > 0
                      ? `Showing ${Math.min(showCount, matchedPool.length)} of ${matchedPool.length} videos matched to your focus`
                      : `Showing ${Math.min(showCount, filtered.length)} of ${filtered.length} videos`}
                  {skillFilter !== 'all' && !assessmentTopics.length && (
                    <span className="text-green-700"> · {TIER_LABELS[skillFilter]}</span>
                  )}
                </p>
              </div>
            )}

            {/* Video list */}
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
                  const skillTiers: string[] = meta?.skill_tiers ?? []
                  const topics: string[] = meta?.topics ?? []
                  const summary: string = meta?.ai_summary ?? ''
                  const isTopicMatch = videoMatchesTopics(video, assessmentTopics)

                  return (
                    <div
                      key={video.id}
                      className={`border rounded-xl overflow-hidden transition-colors ${
                        isTopicMatch && assessmentTopics.length > 0
                          ? 'border-green-200 hover:border-green-300'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
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
                              {skillTiers.length > 0 ? skillTiers.map((tier) => (
                                <span key={tier} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                  {TIER_LABELS[tier] ?? tier}
                                </span>
                              )) : (
                                <span className="text-xs bg-gray-50 text-gray-400 px-2.5 py-1 rounded-full">
                                  All levels
                                </span>
                              )}
                              {video.channel_name && (
                                <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">
                                  {video.channel_name}
                                </span>
                              )}
                              {isTopicMatch && assessmentTopics.length > 0 && (
                                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                  🎯 Recommended
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
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
                        {/* See Details link below badges */}
                        <button
                          onClick={() => toggleExpanded(video.id)}
                          className="mt-2 text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
                        >
                          {isExpanded ? 'Hide Details ▲' : 'See Details ▼'}
                        </button>

                        {/* Expandable section — AI summary + topics for plan users only */}
                        {isExpanded && assessmentTopics.length > 0 && (
                          <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                            {summary && (
                              <p className="text-base text-gray-600 leading-relaxed">
                                {summary}
                              </p>
                            )}
                            {topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {topics.map((topic) => (
                                  <button
                                    key={topic}
                                    onClick={() => setSearch(topic)}
                                    className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                                  >
                                    {topic}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Non-plan users: See Details shows nothing extra — title says it all */}
                        {isExpanded && assessmentTopics.length === 0 && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            <p className="text-sm text-gray-400 italic">
                              Get My Video Plan to unlock AI-powered insights for your plan videos.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Show More / Get 10 More */}
            {assessmentTopics.length > 0 && matchedPool.length > showCount ? (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCount((c) => Math.min(c + 10, matchedPool.length))}
                  className="px-8 py-3 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 transition-colors"
                >
                  Get 10 More Videos →
                </button>
                <p className="text-sm text-gray-400 mt-2">{matchedPool.length} videos match your focus area</p>
              </div>
            ) : hasMore ? (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCount((c) => c + 10)}
                  className="px-8 py-3 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 transition-colors"
                >
                  Show More ({filtered.length - showCount} remaining)
                </button>
              </div>
            ) : null}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">⛳</p>
                <p className="text-gray-600 font-semibold text-lg">No videos found</p>
                <p className="text-base text-gray-400 mt-1">Try a different search or skill level</p>
                <button
                  onClick={() => { setSearch(''); setSkillFilter('all') }}
                  className="mt-4 text-base text-green-700 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
