'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

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

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [savedVideos, setSavedVideos] = useState([])
  const [savedArticles, setSavedArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [skillLevel, setSkillLevel] = useState('')
  const [playingId, setPlayingId] = useState(null)
  const [activeTab, setActiveTab] = useState('videos')
  const [savedAnswers, setSavedAnswers] = useState([])
  const [openArticleId, setOpenArticleId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setSkillLevel(localStorage.getItem('golf_skill_level') || '')

      const [videosRes, answersRes, articlesRes] = await Promise.all([
        supabase.from('saved_videos')
          .select('video_id, created_at, videos(id, title, url, thumbnail_url, youtube_video_id, channel_name)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('saved_answers').select('id, question, answer, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('saved_articles')
          .select('article_id, created_at, articles(id, title, summary, topic, read_time_minutes, content)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
      ])

      if (videosRes.data) setSavedVideos(videosRes.data.filter(s => s.videos))
      if (answersRes.data) setSavedAnswers(answersRes.data)
      if (articlesRes.data) setSavedArticles(articlesRes.data.filter(s => s.articles))
      setLoading(false)
    }
    init()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function getYouTubeId(video) {
    if (video.youtube_video_id) return video.youtube_video_id
    const match = video.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Golfer'
  const userEmail = user?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url

  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900">⛳ MyGolf Companion</a>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        <div className="mb-6 p-6 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-2xl font-bold text-green-800">
              {userName[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
            <p className="text-gray-500 text-sm">{userEmail}</p>
            {skillLevel && (
              <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                🎯 {TIER_LABELS[skillLevel] || skillLevel}
              </span>
            )}
          </div>
          <a href="/plan" className="text-sm font-semibold text-green-700 border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50 transition-colors">
            My Plan
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 border border-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-green-700">{savedVideos.length}</p>
            <p className="text-sm text-gray-500 mt-1">Saved Videos</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-green-700">{savedArticles.length}</p>
            <p className="text-sm text-gray-500 mt-1">Saved Articles</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-green-700">{savedAnswers.length}</p>
            <p className="text-sm text-gray-500 mt-1">Saved Answers</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'videos' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            🔖 Videos ({savedVideos.length})
          </button>
          <button
            onClick={() => setActiveTab('answers')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'answers' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {'🤖 Answers (' + savedAnswers.length + ')'}
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'articles' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {'📖 Articles (' + savedArticles.length + ')'}
          </button>
        </div>

        {activeTab === 'videos' && (
          <div>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : savedVideos.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                <p className="text-3xl mb-2">🔖</p>
                <p className="text-gray-500 font-medium">No saved videos yet</p>
                <a href="/plan" className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">Go to My Plan →</a>
              </div>
            ) : (
              <div className="space-y-3">
                {savedVideos.map((saved) => {
                  const video = saved.videos
                  const ytId = getYouTubeId(video)
                  const isPlaying = playingId === saved.video_id
                  return (
                    <div key={saved.video_id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
                      {isPlaying && ytId ? (
                        <div>
                          <div className="relative w-full aspect-video bg-black">
                            <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            <button onClick={() => setPlayingId(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80">✕</button>
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
                              <img src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={video.title} className="w-20 h-14 object-cover rounded-lg" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{video.title}</p>
                            {video.channel_name && <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>}
                          </div>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'articles' && (
          <div>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : savedArticles.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                <p className="text-3xl mb-2">📖</p>
                <p className="text-gray-500 font-medium">No saved articles yet</p>
                <a href="/learn" className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">Browse Articles →</a>
              </div>
            ) : (
              <div className="space-y-3">
                {savedArticles.map((saved) => {
                  const article = saved.articles
                  const isOpen = openArticleId === saved.article_id
                  return (
                    <div
                      key={saved.article_id}
                      className="border border-gray-100 rounded-xl overflow-hidden hover:border-green-200 transition-colors"
                    >
                      <button
                        onClick={() => setOpenArticleId(isOpen ? null : saved.article_id)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{article.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-400">{article.read_time_minutes} min read</span>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-gray-400">{article.topic}</span>
                            </div>
                          </div>
                          <span className="text-gray-400 shrink-0">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {isOpen && article.content && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                          <div
                            className="text-sm text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: article.content.replace(/

/g, "</p><p class='mb-3'>").replace(/
/g, "<br/>") }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'answers' && (
          <div>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : savedAnswers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                <p className="text-3xl mb-2">🤖</p>
                <p className="text-gray-500 font-medium">No saved answers yet</p>
                <p className="text-sm text-gray-400 mt-1">Save AI answers from the Ask AI tab</p>
                <a href="/plan" className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">Ask MyGolf AI →</a>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAnswers.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">Q: {item.question}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}