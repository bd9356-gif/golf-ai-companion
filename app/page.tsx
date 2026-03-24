'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import AskCompanionTab from '@/components/AskCompanionTab'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIER_LABELS: Record<string, string> = {
  beginner: 'Getting Started',
  intermediate: 'Building Consistency',
  advanced: 'Sharpening Your Game',
  all: 'All Levels',
}

const TIER_VALUES = ['all', 'beginner', 'intermediate', 'advanced']

type Video = {
  id: string
  title: string
  url: string
  description: string
  skill_level: string
  tags: string[]
  score?: number
}

type Tab = 'videos' | 'ask'

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filtered, setFiltered] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [skillFilter, setSkillFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(10)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('videos')

  // Auto-filter from assessment result saved in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('golf_skill_level')
    if (stored && TIER_VALUES.includes(stored)) {
      setSkillFilter(stored)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [videos, skillFilter, search])

  async function fetchVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setVideos(data)
    setLoading(false)
  }

  function applyFilters() {
    let result = [...videos]
    if (skillFilter !== 'all') {
      result = result.filter((v) => v.skill_level === skillFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }
    setFiltered(result)
    setShowCount(10)
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getYouTubeId(url: string): string | null {
    const match = url?.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    return match ? match[1] : null
  }

  const visibleVideos = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 leading-tight">
              ⛳ MyGolf Companion
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Your AI guide to better golf</p>
          </div>
          <a
            href="/onboarding"
            className="text-sm text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition-colors whitespace-nowrap"
          >
            Retake Assessment
          </a>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'videos'
                ? 'text-green-800 border-green-700'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Video Library
          </button>
          <button
            onClick={() => setActiveTab('ask')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ask'
                ? 'text-green-800 border-green-700'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Ask Your Golf AI Companion
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {activeTab === 'ask' ? (
          <AskCompanionTab skillLevel={skillFilter} />
        ) : (
          <>
            {/* Skill tier filter pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {TIER_VALUES.map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSkillFilter(tier)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    skillFilter === tier
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {TIER_LABELS[tier]}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by problem or topic…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
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

            {/* Result count */}
            {!loading && (
              <p className="text-sm text-gray-500 mb-4">
                {filtered.length === 0
                  ? 'No videos found'
                  : `Showing ${Math.min(showCount, filtered.length)} of ${filtered.length} video${filtered.length !== 1 ? 's' : ''}`}
                {skillFilter !== 'all' && (
                  <span className="ml-1">
                    · <span className="text-green-700">{TIER_LABELS[skillFilter]}</span>
                  </span>
                )}
              </p>
            )}

            {/* Video list */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleVideos.map((video) => {
                  const ytId = getYouTubeId(video.url)
                  const isPlaying = playingId === video.id
                  const isExpanded = expandedIds.has(video.id)

                  return (
                    <div
                      key={video.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
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
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-black/80"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Thumbnail with play button */}
                      {!isPlaying && ytId && (
                        <button
                          onClick={() => setPlayingId(video.id)}
                          className="w-full relative block group"
                          aria-label={`Play ${video.title}`}
                        >
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                            alt={video.title}
                            className="w-full object-cover h-44 sm:h-52"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-800 ml-0.5" fill="currentColor">
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
                            <h3 className="font-medium text-gray-900 text-sm leading-snug">
                              {video.title}
                            </h3>
                            <span className="inline-block mt-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              {TIER_LABELS[video.skill_level] ?? video.skill_level}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isPlaying && (
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-400 hover:text-gray-600"
                                title="Open on YouTube"
                              >
                                ↗
                              </a>
                            )}
                            <button
                              onClick={() => toggleExpanded(video.id)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                              aria-label={isExpanded ? 'Hide description' : 'Show description'}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>
                        </div>

                        {/* Expandable description */}
                        {isExpanded && video.description && (
                          <p className="mt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                            {video.description}
                          </p>
                        )}

                        {/* Clickable tags */}
                        {isExpanded && video.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {video.tags.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => setSearch(tag)}
                                className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200 transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Show More */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCount((c) => c + 10)}
                  className="px-6 py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition-colors"
                >
                  Show More ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">⛳</p>
                <p className="text-gray-600 font-medium">No videos found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search or skill level</p>
                <button
                  onClick={() => { setSearch(''); setSkillFilter('all') }}
                  className="mt-4 text-sm text-green-700 hover:underline"
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
