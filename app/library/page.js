'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const TIER_LABELS = {
  beginner: 'Beginner Journey',
  building_game: 'Building Game Journey',
  building_consistency: 'Consistency Journey',
  improving_player: 'Improving Journey',
  advanced_player: 'Advanced Journey',
  senior_player: 'Senior Journey',
}

const TIER_ORDER = ['beginner', 'building_game', 'building_consistency', 'improving_player', 'advanced_player', 'senior_player']

export default function MyBagPage() {
  const [user, setUser] = useState(null)
  const [savedVideos, setSavedVideos] = useState([])
  const [savedArticles, setSavedArticles] = useState([])
  const [savedAnswers, setSavedAnswers] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentSkillLevel, setCurrentSkillLevel] = useState('')
  const [playingId, setPlayingId] = useState(null)
  const [openArticleId, setOpenArticleId] = useState(null)
  const [relatedVideos, setRelatedVideos] = useState({})
  const [openAnswerId, setOpenAnswerId] = useState(null)
  const [viewMode, setViewMode] = useState('journey')
  const [showCart, setShowCart] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const level = localStorage.getItem('golf_skill_level') || ''
      setCurrentSkillLevel(level)
      loadAll(session.user.id)
    }
    init()
  }, [])

  async function loadAll(userId) {
    setLoading(true)
    const [videosRes, articlesRes, answersRes, cartRes] = await Promise.all([
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
        .order('created_at', { ascending: false }),
      supabase.from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ])
    if (videosRes.data) setSavedVideos(videosRes.data.filter(s => s.videos))
    if (articlesRes.data) setSavedArticles(articlesRes.data.filter(s => s.articles))
    if (answersRes.data) setSavedAnswers(answersRes.data)
    if (cartRes.data) setCartItems(cartRes.data)
    setLoading(false)
  }

  // ── Cart functions ──────────────────────────────────────────
  function isInCart(itemId, itemType) {
    return cartItems.some(c => c.item_id === String(itemId) && c.item_type === itemType)
  }

  async function addToCart(itemId, itemType, itemTitle) {
    if (!user || isInCart(itemId, itemType)) return
    const { data, error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      item_id: String(itemId),
      item_type: itemType,
      item_title: itemTitle,
    }).select().single()
    if (!error && data) setCartItems(prev => [data, ...prev])
  }

  async function removeFromCart(itemId, itemType) {
    if (!user) return
    await supabase.from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_id', String(itemId))
      .eq('item_type', itemType)
    setCartItems(prev => prev.filter(c => !(c.item_id === String(itemId) && c.item_type === itemType)))
  }

  async function clearCart() {
    if (!user) return
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    setCartItems([])
  }

  // ── Bag remove functions ────────────────────────────────────
  async function removeVideo(videoId) {
    await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
    setSavedVideos(prev => prev.filter(s => s.video_id !== videoId))
    removeFromCart(videoId, 'video')
  }

  async function removeArticle(articleId) {
    await supabase.from('saved_articles').delete().eq('user_id', user.id).eq('article_id', articleId)
    setSavedArticles(prev => prev.filter(s => s.article_id !== articleId))
    removeFromCart(articleId, 'article')
  }

  async function removeAnswer(id) {
    await supabase.from('saved_answers').delete().eq('user_id', user.id).eq('id', id)
    setSavedAnswers(prev => prev.filter(s => s.id !== id))
    removeFromCart(id, 'answer')
  }

  async function fetchRelatedVideos(articleId, topic) {
    if (relatedVideos[articleId]) return
    const { data } = await supabase.from('videos')
      .select('id, title, url, thumbnail_url, youtube_video_id, video_metadata!video_metadata_video_id_fkey(topics, quality_score)')
      .limit(200)
    if (data) {
      const matched = data.filter(v => {
        const meta = Array.isArray(v.video_metadata) ? v.video_metadata[0] : v.video_metadata
        const tops = (meta?.topics ?? []).map(t => t.toLowerCase())
        return tops.some(t => t.includes(topic?.toLowerCase()) || topic?.toLowerCase().includes(t))
      }).sort((a, b) => {
        const am = Array.isArray(a.video_metadata) ? a.video_metadata[0] : a.video_metadata
        const bm = Array.isArray(b.video_metadata) ? b.video_metadata[0] : b.video_metadata
        return (bm?.quality_score ?? 0) - (am?.quality_score ?? 0)
      }).slice(0, 3)
      setRelatedVideos(prev => ({ ...prev, [articleId]: matched }))
    }
  }

  function getYouTubeId(video) {
    if (video.youtube_video_id) return video.youtube_video_id
    const match = video.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const total = savedVideos.length + savedArticles.length + savedAnswers.length
  const cartCount = cartItems.length

  function getJourneyGroups() {
    const allItems = [
      ...savedVideos.map(s => ({ ...s, itemType: 'video' })),
      ...savedArticles.map(s => ({ ...s, itemType: 'article' })),
      ...savedAnswers.map(s => ({ ...s, itemType: 'answer' })),
    ]
    const grouped = {}
    allItems.forEach(item => {
      const level = item.skill_level || 'unknown'
      if (!grouped[level]) grouped[level] = []
      grouped[level].push(item)
    })
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === currentSkillLevel) return -1
      if (b === currentSkillLevel) return 1
      return TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a)
    })
    return sortedKeys.map(level => ({ level, items: grouped[level] }))
  }

  // ── Cart button ─────────────────────────────────────────────
  function CartButton({ itemId, itemType, itemTitle }) {
    const inCart = isInCart(itemId, itemType)
    return (
      <button
        onClick={() => inCart ? removeFromCart(itemId, itemType) : addToCart(itemId, itemType, itemTitle)}
        className={`text-xs font-semibold transition-colors px-2 py-1 rounded-lg ${
          inCart ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700'
        }`}
      >
        {inCart ? '🛺 Added' : '🛺 Add'}
      </button>
    )
  }

  // ── Card renderers ──────────────────────────────────────────
  function renderVideoCard(saved) {
    const video = saved.videos
    const ytId = getYouTubeId(video)
    const isPlaying = playingId === saved.video_id
    const videoUrl = video.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : null)

    return (
      <div key={saved.video_id} id={`item-${saved.video_id}`} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
        {isPlaying && ytId ? (
          <div>
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button onClick={() => setPlayingId(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm flex-1">{video.title}</p>
              <CartButton itemId={saved.video_id} itemType="video" itemTitle={video.title} />
              <button onClick={() => removeVideo(saved.video_id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3">
            <button onClick={() => setPlayingId(saved.video_id)} className="relative shrink-0">
              {ytId && (
                <div className="relative">
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
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🎬 Video</span>
              {videoUrl ? (
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="block font-semibold text-gray-900 text-sm leading-snug mt-1 line-clamp-2 hover:text-green-700">
                  {video.title}
                </a>
              ) : (
                <p className="font-semibold text-gray-900 text-sm leading-snug mt-1 line-clamp-2">{video.title}</p>
              )}
              {video.channel_name && <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>}
            </div>
            <div className="flex flex-col gap-5 items-end shrink-0">
              <button onClick={() => removeVideo(saved.video_id)} className="text-sm text-red-400 hover:text-red-600 font-semibold py-1 px-2">Remove</button>
              <CartButton itemId={saved.video_id} itemType="video" itemTitle={video.title} />
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderArticleCard(saved) {
    const article = saved.articles
    const isOpen = openArticleId === saved.article_id
    return (
      <div key={saved.article_id} id={`item-${saved.article_id}`} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
        <div className="flex items-start gap-3 p-4">
          <button onClick={() => setOpenArticleId(isOpen ? null : saved.article_id)} className="flex-1 text-left">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">📖 Guide</span>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug mt-1 hover:text-green-700">{article.title}</h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
            <span className="text-xs text-green-700 mt-1 inline-block">{isOpen ? 'Close ▲' : 'Read ▼'}</span>
          </button>
          <div className="flex flex-col gap-5 items-end shrink-0">
            <button onClick={() => removeArticle(saved.article_id)} className="text-sm text-red-400 hover:text-red-600 font-semibold py-1 px-2">Remove</button>
            <CartButton itemId={saved.article_id} itemType="article" itemTitle={article.title} />
          </div>
        </div>
        {isOpen && article.content && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: (article.content || '').split('\n\n').join('</p><p class="mb-3">').split('\n').join('<br/>') }} />
            <button
              onClick={() => setOpenArticleId(null)}
              className="mt-4 w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close Guide ▲
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderAnswerCard(item) {
    const isOpen = openAnswerId === item.id
    return (
      <div key={item.id} id={`item-${item.id}`} className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
        <div className="flex items-start gap-3 p-4">
          <button onClick={() => setOpenAnswerId(isOpen ? null : item.id)} className="flex-1 text-left">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🤖 MyPro Answer</span>
            <p className="font-semibold text-gray-900 text-sm mt-1 hover:text-green-700">{item.question}</p>
            <span className="text-xs text-green-700 mt-1 inline-block">{isOpen ? 'Close ▲' : 'Read ▼'}</span>
          </button>
          <div className="flex flex-col gap-5 items-end shrink-0">
            <button onClick={() => removeAnswer(item.id)} className="text-sm text-red-400 hover:text-red-600 font-semibold py-1 px-2">Remove</button>
            <CartButton itemId={item.id} itemType="answer" itemTitle={item.question} />
          </div>
        </div>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
          </div>
        )}
      </div>
    )
  }

  // ── My Plan panel ───────────────────────────────────────────
  function renderCart() {
    if (cartCount === 0) {
      return (
        <div className="text-center py-8 border border-dashed border-yellow-200 rounded-xl bg-yellow-50">
          <p className="text-3xl mb-2">🛺</p>
          <p className="text-sm font-semibold text-yellow-800">Your plan is empty</p>
          <p className="text-xs text-yellow-600 mt-1">Tap "🛺 Add to Cart" on any item below to load today's focus</p>
        </div>
      )
    }

    return (
      <div className="border border-yellow-300 rounded-xl bg-yellow-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200">
          <div>
            <p className="text-sm font-bold text-yellow-900">🛺 My Plan — {cartCount} item{cartCount !== 1 ? 's' : ''} loaded</p>
            <p className="text-xs text-yellow-600 mt-0.5">You're prioritizing what you've saved for your plan — nothing leaves your Bag.</p>
          </div>
          <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 font-semibold whitespace-nowrap ml-3">
            Clear All
          </button>
        </div>
        <div className="divide-y divide-yellow-100">
          {cartItems.map(item => {
            function handleCartItemClick() {
              setShowCart(false)
              setViewMode('journey')
              if (item.item_type === 'video') {
                setPlayingId(item.item_id)
              } else if (item.item_type === 'article') {
                setOpenArticleId(item.item_id)
              } else if (item.item_type === 'answer') {
                setOpenAnswerId(item.item_id)
              }
              setTimeout(() => {
                const el = document.getElementById(`item-${item.item_id}`)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 150)
            }
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg">
                  {item.item_type === 'video' ? '🎬' : item.item_type === 'article' ? '📖' : '🤖'}
                </span>
                <button
                  onClick={handleCartItemClick}
                  className="flex-1 text-sm font-medium text-green-700 hover:underline text-left line-clamp-1"
                >
                  {item.item_title}
                </button>
                <button onClick={() => removeFromCart(item.item_id, item.item_type)} className="text-xs text-gray-400 hover:text-red-500 shrink-0 font-semibold">✕</button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!user) return null
  const journeyGroups = getJourneyGroups()

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
              <p className="text-base text-gray-500 mt-1">Your AI guide to better golf</p>
            </div>
            <button
              onClick={() => setShowCart(s => !s)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-colors ${
                showCart ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-gray-200 text-gray-600 hover:border-yellow-300'
              }`}
            >
              <span className="text-lg">🛺</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span className="text-sm font-semibold">My Plan</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.location.href='/welcome'} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</button>
            <span className="px-3 py-2 text-sm font-semibold text-green-800 border-b-2 border-green-700">MyBag</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* My Plan panel */}
        {showCart && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">🛺 My Plan</h2>
            {renderCart()}
          </div>
        )}

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🏌️ MyBag</h2>
            <p className="text-gray-500 mt-1">{total} saved item{total !== 1 ? 's' : ''} — your golf learning journey</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('journey')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${viewMode === 'journey' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              By Journey
            </button>
            <button
              onClick={() => setViewMode('type')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${viewMode === 'type' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              By Group
            </button>
          </div>
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
        ) : viewMode === 'journey' ? (
          <div className="space-y-8">
            {journeyGroups.map(({ level, items }) => (
              <div key={level}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex-1 h-px ${level === currentSkillLevel ? 'bg-green-300' : 'bg-gray-200'}`} />
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${level === currentSkillLevel ? 'bg-green-700 text-white' : 'bg-green-100 text-green-700'}`}>
                    {level === currentSkillLevel ? '📍 ' : ''}{TIER_LABELS[level] || 'Other'}{level === currentSkillLevel ? ' (current)' : ''}
                  </span>
                  <div className={`flex-1 h-px ${level === currentSkillLevel ? 'bg-green-300' : 'bg-gray-200'}`} />
                </div>
                <p className="text-xs text-gray-400 text-center mb-3">{items.length} item{items.length !== 1 ? 's' : ''} saved at this level</p>
                <div className="space-y-3">
                  {items.map(item => {
                    if (item.itemType === 'video') return renderVideoCard(item)
                    if (item.itemType === 'article') return renderArticleCard(item)
                    if (item.itemType === 'answer') return renderAnswerCard(item)
                    return null
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {savedVideos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">🎬 MyVideos ({savedVideos.length})</h3>
                <div className="space-y-3">{savedVideos.map(s => renderVideoCard(s))}</div>
              </div>
            )}
            {savedArticles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">📖 MyGuides ({savedArticles.length})</h3>
                <div className="space-y-3">{savedArticles.map(s => renderArticleCard(s))}</div>
              </div>
            )}
            {savedAnswers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">🤖 MyPro Answers ({savedAnswers.length})</h3>
                <div className="space-y-3">{savedAnswers.map(s => renderAnswerCard(s))}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}