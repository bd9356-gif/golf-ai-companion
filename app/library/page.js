'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function MyBagPage() {
  const [user, setUser] = useState(null)
  const [savedVideos, setSavedVideos] = useState([])
  const [savedArticles, setSavedArticles] = useState([])
  const [savedAnswers, setSavedAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState(null)
  const [openArticleId, setOpenArticleId] = useState(null)
  const [openAnswerId, setOpenAnswerId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      loadAll(session.user.id)
    }
    init()
  }, [])

  async function loadAll(userId) {
    setLoading(true)
    const [videosRes, articlesRes, answersRes] = await Promise.all([
      supabase.from('saved_videos')
        .select('video_id, created_at, skill_level, videos(id, title, url, thumbnail_url, youtube_video_id, channel_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('saved_articles')
        .select('article_id, created_at, skill_level, articles(id, title, summary, topic, read_time_minutes, content)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('saved_answers')
        .select('id, question, answer, created_at, skill_level')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ])
    if (videosRes.data) setSavedVideos(videosRes.data.filter(s => s.videos))
    if (articlesRes.data) setSavedArticles(articlesRes.data.filter(s => s.articles))
    if (answersRes.data) setSavedAnswers(answersRes.data)
    setLoading(false)
  }

  async function removeVideo(videoId) {
    await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
    setSavedVideos(prev => prev.filter(s => s.video_id !== videoId))
  }

  async function removeArticle(articleId) {
    await supabase.from('saved_articles').delete().eq('user_id', user.id).eq('article_id', articleId)
    setSavedArticles(prev => prev.filter(s => s.article_id !== articleId))
  }

  async function removeAnswer(id) {
    await supabase.from('saved_answers').delete().eq('user_id', user.id).eq('id', id)
    setSavedAnswers(prev => prev.filter(s => s.id !== id))
  }

  function getYouTubeId(video) {
    if (video.youtube_video_id) return video.youtube_video_id
    const match = video.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const total = savedVideos.length + savedArticles.length + savedAnswers.length

  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-base text-gray-500 mt-1">Your AI guide to better golf</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.location.href='/welcome'} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</button>
            <span className="px-3 py-2 text-sm font-semibold text-green-800 border-b-2 border-green-700">MyBag</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">🏌️ MyBag</h2>
          <p className="text-gray-500 mt-1">{total} saved item{total !== 1 ? 's' : ''} — your videos, guides, and AI answers</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="text-gray-600 font-semibold text-lg">Your bag is empty</p>
            <p className="text-sm text-gray-400 mt-1">Save videos, articles and AI answers to build your bag</p>
            <a href="/plan" className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">Go to MyGolf Plan →</a>
          </div>
        ) : (
          <div className="space-y-6">

            {savedVideos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">🎬 MyVideos ({savedVideos.length})</h3>
                <div className="space-y-3">
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
                            <div className="p-3 flex items-center justify-between">
                              <p className="font-semibold text-gray-900 text-sm">{video.title}</p>
                              <button onClick={() => removeVideo(saved.video_id)} className="text-xs text-red-400 hover:text-red-600 ml-2 shrink-0">Remove</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-3">
                            <button onClick={() => setPlayingId(saved.video_id)} className="relative shrink-0">
                              {ytId && (
                                <div>
                                  <img src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={video.title} className="w-24 h-16 object-cover rounded-lg" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
                                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{video.title}</p>
                              {video.channel_name && <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>}
                            </div>
                            <button onClick={() => removeVideo(saved.video_id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {savedArticles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">📖 MyGuides ({savedArticles.length})</h3>
                <div className="space-y-3">
                  {savedArticles.map(saved => {
                    const article = saved.articles
                    const isOpen = openArticleId === saved.article_id
                    return (
                      <div key={saved.article_id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
                        <div className="flex items-start gap-3 p-4">
                          <button onClick={() => setOpenArticleId(isOpen ? null : saved.article_id)} className="flex-1 text-left">
                            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{article.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                            {saved.skill_level && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Saved from {saved.skill_level.replace(/_/g, " ")}</span>}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">{article.read_time_minutes} min read</span>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-green-700">{isOpen ? 'Close ▲' : 'Read ▼'}</span>
                            </div>
                          </button>
                          <button onClick={() => removeArticle(saved.article_id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                        </div>
                        {isOpen && article.content && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                            <div className="text-sm text-gray-700 leading-relaxed"
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

            {savedAnswers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">🤖 MyPro Answers ({savedAnswers.length})</h3>
                <div className="space-y-3">
                  {savedAnswers.map(item => {
                    const isOpen = openAnswerId === item.id
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
                        <div className="flex items-start gap-3 p-4">
                          <button onClick={() => setOpenAnswerId(isOpen ? null : item.id)} className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 text-sm">{item.question}</p>
                            {item.skill_level && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Saved from {item.skill_level.replace(/_/g, " ")}</span>}
                            <span className="text-xs text-green-700">{isOpen ? 'Close ▲' : 'Read ▼'}</span>
                          </button>
                          <button onClick={() => removeAnswer(item.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                        </div>
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