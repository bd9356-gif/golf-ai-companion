'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

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

const TOPIC_LABELS = {
  swing: 'Swing Tips',
  'course management': 'Course Management',
  'mental game': 'Mental Game',
  fitness: 'Fitness & Mobility',
}

const TOPIC_ICONS = {
  swing: '🏌️',
  'course management': '🗺️',
  'mental game': '🧠',
  fitness: '💪',
}

// Simple markdown renderer
function renderMarkdown(text) {
  return text
    .replace(/## (.+)/g, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>')
}

export default function LearnPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [skillLevel, setSkillLevel] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [openArticle, setOpenArticle] = useState(null)

  useEffect(() => {
    const level = localStorage.getItem('golf_skill_level')
    if (level) setSkillLevel(level)
    fetchArticles()
  }, [])

  async function fetchArticles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setArticles(data)
    setLoading(false)
  }

  // Filter by topic
  const topicFiltered = selectedTopic === 'all'
    ? articles
    : articles.filter(a => a.topic === selectedTopic)

  // Plan users see ONLY their matched articles
  // Non-plan users see all articles
  const sorted = skillLevel
    ? topicFiltered.filter(a => a.skill_tiers?.includes(skillLevel))
    : topicFiltered

  const topics = ['all', ...Object.keys(TOPIC_LABELS)]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900">⛳ MyGolf Companion</a>
          <div className="flex items-center gap-2">
            <a href="/videos" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5">Videos</a>
            <span className="text-sm font-semibold text-green-800 border-b-2 border-green-700 px-3 py-1.5">Learn</span>
            {skillLevel ? (
              <a href="/plan" className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors whitespace-nowrap">
                My Plan
              </a>
            ) : (
              <a href="/onboarding" className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors whitespace-nowrap">
                Get My Video Plan
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* Personalized banner */}
        {skillLevel ? (
          <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800 flex items-center justify-between">
            <span>
              🎯 Showing articles for your plan: <strong>{TIER_LABELS[skillLevel]}</strong>
            </span>
            <a href="/onboarding" className="text-xs text-green-600 hover:text-green-800 whitespace-nowrap ml-3">
              Update plan
            </a>
          </div>
        ) : (
          <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center justify-between">
            <span>📖 Browsing all articles — <a href="/onboarding" className="text-green-700 font-semibold hover:underline">Get My Video Plan</a> to see articles matched to your game</span>
          </div>
        )}

        {/* Page title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Golf Articles</h2>
          <p className="text-gray-500 mt-1">Practical tips and strategies to lower your scores</p>
        </div>

        {/* Topic filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {topics.map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedTopic === topic
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {topic === 'all' ? 'All Topics' : `${TOPIC_ICONS[topic]} ${TOPIC_LABELS[topic]}`}
            </button>
          ))}
        </div>

        {/* Article grid */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-gray-600 font-semibold text-lg">No articles yet</p>
            <p className="text-base text-gray-400 mt-1">Check back soon</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map(article => {
              return (
                <div
                  key={article.id}
                  className={`border rounded-xl p-5 transition-all cursor-pointer hover:shadow-sm ${
                    skillLevel ? 'border-green-200 bg-green-50/40' : 'border-gray-200'
                  }`}
                  onClick={() => setOpenArticle(openArticle?.id === article.id ? null : article)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                          {TOPIC_ICONS[article.topic]} {TOPIC_LABELS[article.topic] ?? article.topic}
                        </span>
                        {skillLevel && (
                          <span className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold">
                            🎯 In Your Plan
                          </span>
                        )}
                        
                        <p className="text-sm text-gray-400 mt-1 italic">
                          Update your plan to access this article
                        </p>
                      )}
                    </div>
                    {(
                      <span className="text-gray-400 text-lg shrink-0 mt-1">
                        {openArticle?.id === article.id ? '▲' : '▼'}
                      </span>
                    )}
                  </div>

                  {/* Full article content */}
                  {openArticle?.id === article.id && (
                    <div
                      className="mt-5 pt-5 border-t border-gray-200 text-base text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: `<p class="mb-4">${renderMarkdown(article.content)}</p>`
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}