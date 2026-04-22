'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import SafeYouTube from '@/components/SafeYouTube'

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
  putting: 'Putting',
  'short game': 'Short Game',
}

const TOPIC_ICONS = {
  swing: '🏌️',
  'course management': '🗺️',
  'mental game': '🧠',
  fitness: '💪',
  putting: '⛳',
  'short game': '🎯',
}

// Per-topic color scheme. Each topic group gets its own left-edge stripe +
// header background so the page reads at a glance. Matches the MyBag
// per-skill palette where the topics line up (swing → green, short game →
// orange, putting → sky, course management → purple). Mental game and
// fitness pick up their own hues to stay distinct.
// One unified green treatment across every topic — matches Swing Tips.
const GREEN_TOPIC = {
  outer: 'border-gray-200 border-l-8 border-l-green-600',
  headerBg: 'bg-green-50',
  title: 'text-green-900',
  count: 'text-green-700',
  bodyBg: 'bg-green-50/40',
}
const TOPIC_COLORS = {
  swing:               GREEN_TOPIC,
  'course management': GREEN_TOPIC,
  'mental game':       GREEN_TOPIC,
  fitness:             GREEN_TOPIC,
  putting:             GREEN_TOPIC,
  'short game':        GREEN_TOPIC,
}
const topicColor = (t) => TOPIC_COLORS[t] || GREEN_TOPIC

function renderMarkdown(text) {
  return text
    .replace(/## (.+)/g, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>')
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [openArticle, setOpenArticle] = useState(null)
  const [playingVideoId, setPlayingVideoId] = useState(null)
  const [relatedVideos, setRelatedVideos] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [user, setUser] = useState(null)
  const [collapsedTopics, setCollapsedTopics] = useState(new Set())

  useEffect(() => {
    fetchArticles()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        const { data } = await supabase
          .from('saved_articles')
          .select('article_id')
          .eq('user_id', session.user.id)
        if (data) setSavedIds(new Set(data.map(s => s.article_id)))
      }
    })
  }, [])

  async function fetchArticles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setArticles(data)
      // Default all topic sections to collapsed on open.
      const topicsInData = new Set(data.map(a => a.topic))
      setCollapsedTopics(topicsInData)
    }
    setLoading(false)
  }

  function toggleTopic(topic) {
    setCollapsedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topic)) next.delete(topic)
      else next.add(topic)
      return next
    })
  }

  async function fetchRelatedVideos(article) {
    const topic = article.topic.toLowerCase()
    const { data } = await supabase
      .from('videos')
      .select('id, title, url, thumbnail_url, youtube_video_id, video_metadata!video_metadata_video_id_fkey(topics, quality_score)')
      .limit(200)
    if (data) {
      const matched = data.filter(v => {
        const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
        const tops = (meta?.topics ?? []).map(t => t.toLowerCase())
        return tops.some(t => t.includes(topic) || topic.includes(t))
      }).sort((a, b) => {
        const am = Array.isArray(a.video_metadata) ? a.video_metadata[0] : a.video_metadata
        const bm = Array.isArray(b.video_metadata) ? b.video_metadata[0] : b.video_metadata
        return (bm?.quality_score ?? 0) - (am?.quality_score ?? 0)
      })
      setRelatedVideos(matched.slice(0, 10).sort(() => Math.random() - 0.5).slice(0, 3))
    }
  }

  async function ensureHoldingBucketId(userId) {
    const { data: existing } = await supabase
      .from('focus_leaves')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Holding Bucket')
      .maybeSingle()
    if (existing?.id) return existing.id
    const { data: created } = await supabase
      .from('focus_leaves')
      .insert({ user_id: userId, name: 'Holding Bucket', position: 0 })
      .select('id')
      .single()
    return created?.id ?? null
  }

  async function addToHoldingBucket(userId, itemType, itemId) {
    const leafId = await ensureHoldingBucketId(userId)
    if (!leafId) return
    const { data: maxRow } = await supabase
      .from('leaf_items')
      .select('position')
      .eq('leaf_id', leafId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextPos = (maxRow?.position ?? -1) + 1
    await supabase.from('leaf_items').upsert(
      { leaf_id: leafId, user_id: userId, item_type: itemType, item_id: String(itemId), position: nextPos },
      { onConflict: 'leaf_id,item_type,item_id', ignoreDuplicates: true }
    )
  }

  async function toggleSaved(articleId) {
    if (!user) { window.location.href = '/login'; return }
    const isSaved = savedIds.has(articleId)
    if (isSaved) {
      await supabase.from('saved_articles').delete()
        .eq('user_id', user.id).eq('article_id', articleId)
      await supabase.from('leaf_items').delete()
        .eq('user_id', user.id).eq('item_type', 'article').eq('item_id', String(articleId))
      setSavedIds(prev => { const next = new Set(prev); next.delete(articleId); return next })
    } else {
      await supabase.from('saved_articles').insert({
        user_id: user.id, article_id: articleId
      })
      await addToHoldingBucket(user.id, 'article', articleId)
      setSavedIds(prev => new Set([...prev, articleId]))
    }
  }

  async function saveVideoToLibrary(videoId) {
    if (!user) { window.location.href = '/login'; return }
    await supabase.from('saved_videos').upsert({ user_id: user.id, video_id: videoId })
    await addToHoldingBucket(user.id, 'video', videoId)
    alert('Added to MyBag!')
  }

  const topicFiltered = selectedTopic === 'all' ? articles : articles.filter(a => a.topic === selectedTopic)
  const sorted = topicFiltered
  const topics = ['all', ...Object.keys(TOPIC_LABELS)]

  // Group sorted articles by topic, preserving topic order from TOPIC_LABELS.
  const grouped = (() => {
    const order = Object.keys(TOPIC_LABELS)
    const map = new Map()
    for (const a of sorted) {
      if (!map.has(a.topic)) map.set(a.topic, [])
      map.get(a.topic).push(a)
    }
    const knownGroups = order.filter(t => map.has(t)).map(t => [t, map.get(t)])
    const unknownGroups = [...map.entries()].filter(([t]) => !order.includes(t))
    return [...knownGroups, ...unknownGroups]
  })()

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="/clubhouse" className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0" aria-label="Back to Clubhouse">← Clubhouse</a>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">📖</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">Guides</h1>
              <p className="text-xs text-green-700 font-semibold leading-tight">AI-crafted, matched to your game</p>
            </div>
          </div>
          <a href="/bag" className="text-3xl shrink-0 hover:scale-110 transition-transform leading-none" aria-label="Your Golf Bag" title="Your Golf Bag">🏌️</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-gray-500">AI-crafted guides matched to your game — talk it over with your buddies.</p>
        </div>

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
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([topic, items]) => {
              const isCollapsed = collapsedTopics.has(topic)
              const c = topicColor(topic)
              return (
                <section key={topic} className={`border-2 rounded-2xl ${c.outer}`}>
                  <button
                    onClick={() => toggleTopic(topic)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-t-2xl ${isCollapsed ? 'bg-white rounded-b-2xl' : c.headerBg}`}
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TOPIC_ICONS[topic] ?? '📖'}</span>
                      <span className={`font-semibold ${c.title}`}>{TOPIC_LABELS[topic] ?? topic}</span>
                      <span className={`text-xs font-semibold ${c.count}`}>({items.length})</span>
                    </div>
                    <span className={`text-lg ${c.title} opacity-70`}>{isCollapsed ? '▼' : '▲'}</span>
                  </button>
                  {!isCollapsed && (
                    <div className={`px-4 pb-4 pt-3 space-y-4 rounded-b-2xl ${c.bodyBg}`}>
                      {items.map(article => {
              const isSaved = savedIds.has(article.id)
              return (
                <div
                  key={article.id}
                  className="border rounded-xl p-5 transition-all border-gray-200"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      const next = openArticle?.id === article.id ? null : article
                      setOpenArticle(next)
                      if (next) fetchRelatedVideos(next)
                      else setRelatedVideos([])
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                            {TOPIC_ICONS[article.topic]} {TOPIC_LABELS[article.topic] ?? article.topic}
                          </span>
                          <span className="text-xs text-gray-400">{article.read_time_minutes} min read</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base leading-snug">{article.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{article.summary}</p>
                      </div>
                      <span className="text-gray-400 text-lg shrink-0 mt-1">
                        {openArticle?.id === article.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => toggleSaved(article.id)}
                      className={`text-sm font-semibold transition-colors ${isSaved ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {isSaved ? '🔖 Saved' : '🔖 Save Article'}
                    </button>
                  </div>

                  {openArticle?.id === article.id && (
                    <div className="mt-5 pt-5 border-t border-gray-200">
                      <div
                        className="text-base text-gray-700 leading-relaxed mb-5"
                        dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${renderMarkdown(article.content)}</p>` }}
                      />
                      {relatedVideos.length > 0 && (
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-sm font-semibold text-gray-500 mb-3">🎬 Related Videos</p>
                          <div className="space-y-2">
                            {relatedVideos.map(v => (
                              <div key={v.id} className="rounded-lg overflow-hidden bg-gray-50">
                                {playingVideoId === v.id ? (
                                  <div>
                                    <SafeYouTube videoId={v.youtube_video_id} onClose={() => setPlayingVideoId(null)} />
                                    <div className="p-2 flex items-center justify-between">
                                      <p className="text-xs text-gray-600 font-medium line-clamp-1">{v.title}</p>
                                      <button onClick={() => saveVideoToLibrary(v.id)} className="text-xs text-green-700 font-semibold ml-2 shrink-0">🔖 MyBag</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 p-2">
                                    <button onClick={() => setPlayingVideoId(v.id)} className="relative shrink-0">
                                      <img
                                        src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_video_id}/mqdefault.jpg`}
                                        alt={v.title}
                                        className="w-20 h-12 object-cover rounded-lg"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow">
                                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                      </div>
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-700 font-medium leading-snug line-clamp-2">{v.title}</p>
                                      <button onClick={() => saveVideoToLibrary(v.id)} className="text-xs text-green-700 font-semibold mt-1">🔖 Add to MyBag</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}