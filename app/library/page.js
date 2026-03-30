'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LibraryPage() {
  const [user, setUser] = useState(null)
  const [savedVideos, setSavedVideos] = useState([])
  const [savedArticles, setSavedArticles] = useState([])
  const [savedAnswers, setSavedAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [playingId, setPlayingId] = useState(null)
  const [openArticleId, setOpenArticleId] = useState(null)
  const [openAnswerId, setOpenAnswerId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const [videosRes, articlesRes, answersRes] = await Promise.all([
        supabase.from('saved_videos')
          .select('video_id, created_at, videos(id, title, url, thumbnail_url, youtube_video_id, channel_name)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('saved_articles')
          .select('article_id, created_at, articles(id, title, summary, topic, read_time_minutes, content)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('saved_answers')
          .select('id, question, answer, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
      ])

      if (videosRes.data) setSavedVideos(videosRes.data.filter(s => s.videos))
      if (articlesRes.data) setSavedArticles(articlesRes.data.filter(s => s.articles))
      if (answersRes.data) setSavedAnswers(answersRes.data)
      setLoading(false)
    }
    init()
  }, [])

  function getYouTubeId(video) {
    if (video.youtube_video_id) return video.youtube_video_id
    const match = video.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const totalItems = savedVideos.length + savedArticles.length + savedAnswers.length

  const tabs = [
    { id: 'all', label: 'All', count: totalItems },
    { id: 'videos', label: '🎬 Videos', count: savedVideos.length },
    { id: 'articles', label: '📖 Articles', count: savedArticles.length },
    { id: 'answers', label: '🤖 AI Answers', count: savedAnswers.length },
  ]

  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">⛳ MyGolf Companion</h1>
              <p className="text-base text-gray-500 mt-1">Your AI guide to better golf</p>
            </div>
            <a href="/profile" className="text-sm text-gray-500 hover:text-gray-700">👤 Profile</a>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.history.back()} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</button>
            <a href="/plan" className="px-3 py-2 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700">MyGolf Plan</a>
            <a href="/videos" className="px-3 py-2 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700">Videos</a>
            <a href="/learn" className="px-3 py-2 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700">Articles</a>
            <span className="px-3 py-2 text-sm font-semibold text-green-800 border-b-2 border-green-700">Library</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📚 My Library</h2>
          <p className="text-gray-500 mt-1">{totalItems} saved item{totalItems !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-gray-600 font-semibold text-lg">Your library is empty</p>
            <p className="text-sm text-gray-400 mt-1">Save videos, articles and AI answers to build your library</p>
            <div className="flex gap-3 justify-center mt-6">
              <a href="/plan" className="text-sm text-green-700 font-semibold border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50">MyGolf Plan</a>
              <a href="/learn" className="text-sm text-gray-600 font-semibold border-2 border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50">Articles</a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {(activeTab === 'all' || activeTab === 'videos') && savedVideos.length > 0 && (
              <div>
                {activeTab === 'all' && <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">🎬 Videos</h3>}
                <div className="grid grid-cols-1 gap-3">
                  {savedVideos.map(saved => {
                    const video = saved.videos
                    const ytId = getYouTubeId(video)
                    const isPlaying = playingId === saved.video_id
                    return (
                      <div key={saved.video_id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
                        {isPlaying && ytId ? (
                          <div>
                            <div className="relative w-full aspect-video bg-black">
                              <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                              <button onClick={() => setPlayingId(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
                            </div>
                            <div className="p-3">
                              <p className="font-semibold text-gray-900 text-sm">{video.title}</p>
                              {video.channel_name && <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>}
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setPlayingId(saved.video_id)} className="w-full flex items-center gap-3 p-3 text-left">
                            {ytId && (
                              <div className="relative shrink-0">
                                <img src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={video.title} className="w-24 h-16 object-cover rounded-lg" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Video</span>
                              <p className="font-semibold text-gray-900 text-sm leading-snug mt-1 line-clamp-2">{video.title}</p>
                              {video.channel_name && <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>}
                            </div>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'articles') && savedArticles.length > 0 && (
              <div>
                {activeTab === 'all' && <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-4">📖 Articles</h3>}
                <div className="grid grid-cols-1 gap-3">
                  {savedArticles.map(saved => {
                    const article = saved.articles
                    const isOpen = openArticleId === saved.article_id
                    return (
                      <div key={saved.article_id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
                        <button onClick={() => setOpenArticleId(isOpen ? null : saved.article_id)} className="w-full text-left p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Article</span>
                              <h3 className="font-semibold text-gray-900 text-sm leading-snug mt-1">{article.title}</h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-400">{article.read_time_minutes} min read</span>
                                <span className="text-xs text-gray-300">·</span>
                                <span className="text-xs text-gray-400">{article.topic}</span>
                              </div>
                            </div>
                            <span className="text-gray-400 shrink-0">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {isOpen && article.content && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                            <div
                              className="text-sm text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: (article.content || '').split('\n\n').join('</p><p class="mb-3">').split('\n').join('<br/>') }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'answers') && savedAnswers.length > 0 && (
              <div>
                {activeTab === 'all' && <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-4">🤖 AI Answers</h3>}
                <div className="grid grid-cols-1 gap-3">
                  {savedAnswers.map(item => {
                    const isOpen = openAnswerId === item.id
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
                        <button onClick={() => setOpenAnswerId(isOpen ? null : item.id)} className="w-full text-left p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">AI Answer</span>
                              <p className="font-semibold text-gray-900 text-sm mt-1">{item.question}</p>
                            </div>
                            <span className="text-gray-400 shrink-0">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                            <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}