'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Fixed, locked 5-bucket structure. Order is enforced.
const FIXED_BUCKETS = [
  { name: 'Holding Bucket',    position: 0, icon: '📥', hint: 'Every new save lands here. Move it into a bucket below when you decide what to work on.' },
  { name: 'Full Swing',        position: 1, icon: '🏌️', hint: null },
  { name: 'Short Game',        position: 2, icon: '🪓', hint: null },
  { name: 'Putting',           position: 3, icon: '⛳', hint: null },
  { name: 'Course Management', position: 4, icon: '🗺️', hint: null },
]
const BUCKET_META = Object.fromEntries(FIXED_BUCKETS.map(b => [b.name, b]))

async function ensureFixedBuckets(userId) {
  const { data: existing } = await supabase
    .from('focus_leaves')
    .select('id, name')
    .eq('user_id', userId)
  const existingNames = new Set((existing || []).map(r => r.name))
  const toInsert = FIXED_BUCKETS
    .filter(b => !existingNames.has(b.name))
    .map(b => ({ user_id: userId, name: b.name, position: b.position }))
  if (toInsert.length > 0) {
    await supabase.from('focus_leaves').insert(toInsert)
  }
}

// ════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════
export default function BagPage() {
  const [user, setUser] = useState(null)
  const [leaves, setLeaves] = useState([])                // [{id,name,position}]
  const [leafItems, setLeafItems] = useState([])          // [{id,leaf_id,item_type,item_id,position}]
  const [savedVideos, setSavedVideos] = useState({})      // id -> saved_video row
  const [savedArticles, setSavedArticles] = useState({})  // id -> saved_article row
  const [savedAnswers, setSavedAnswers] = useState({})    // id -> saved_answer row
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [collapsed, setCollapsed] = useState(new Set())   // leaf ids that are collapsed
  const [playingVideoKey, setPlayingVideoKey] = useState(null) // 'video:<id>' or null
  const [openArticleKey, setOpenArticleKey] = useState(null)
  const [openAnswerKey, setOpenAnswerKey] = useState(null)
  const [moveMenuItemId, setMoveMenuItemId] = useState(null)

  const router = useRouter()

  // ── Init ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      await ensureFixedBuckets(session.user.id)
      await loadAll(session.user.id)
    }
    init()
  }, [])

  async function loadAll(userId) {
    setLoading(true)
    const [leavesRes, leafItemsRes, videosRes, articlesRes, answersRes, cartRes] = await Promise.all([
      supabase.from('focus_leaves').select('*').eq('user_id', userId).order('position', { ascending: true }),
      supabase.from('leaf_items').select('*').eq('user_id', userId).order('position', { ascending: true }),
      supabase.from('saved_videos')
        .select('video_id, created_at, skill_level, videos(id, title, url, thumbnail_url, youtube_video_id, channel_name)')
        .eq('user_id', userId),
      supabase.from('saved_articles')
        .select('article_id, created_at, skill_level, articles(id, title, summary, topic, read_time_minutes, content)')
        .eq('user_id', userId),
      supabase.from('saved_answers')
        .select('id, question, answer, created_at, skill_level')
        .eq('user_id', userId),
      supabase.from('cart_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ])

    setLeaves(leavesRes.data || [])
    setLeafItems(leafItemsRes.data || [])

    const videosMap = {}
    ;(videosRes.data || []).forEach(s => { if (s.videos) videosMap[s.video_id] = s })
    setSavedVideos(videosMap)

    const articlesMap = {}
    ;(articlesRes.data || []).forEach(s => { if (s.articles) articlesMap[s.article_id] = s })
    setSavedArticles(articlesMap)

    const answersMap = {}
    ;(answersRes.data || []).forEach(s => { answersMap[s.id] = s })
    setSavedAnswers(answersMap)

    setCartItems(cartRes.data || [])
    setLoading(false)
  }

  // ── Derived ──────────────────────────────────────────────────────
  const itemsByLeafId = useMemo(() => {
    const map = {}
    for (const leaf of leaves) map[leaf.id] = []
    for (const li of [...leafItems].sort((a, b) => a.position - b.position)) {
      if (map[li.leaf_id]) map[li.leaf_id].push(li)
    }
    return map
  }, [leaves, leafItems])

  // ── Leaf-item CRUD ───────────────────────────────────────────────
  async function persistItemOrder(leafId, nextItems) {
    const rows = nextItems.map((li, i) => ({
      id: li.id,
      leaf_id: li.leaf_id,
      user_id: li.user_id,
      item_type: li.item_type,
      item_id: li.item_id,
      position: i,
    }))
    await supabase.from('leaf_items').upsert(rows)
  }

  async function moveItemToLeaf(leafItemId, toLeafId) {
    const li = leafItems.find(x => x.id === leafItemId)
    if (!li || li.leaf_id === toLeafId) { setMoveMenuItemId(null); return }
    // If same-type/id already exists in target, just delete the current one
    const dup = leafItems.find(x => x.leaf_id === toLeafId && x.item_type === li.item_type && x.item_id === li.item_id)
    if (dup) {
      await supabase.from('leaf_items').delete().eq('id', leafItemId)
      setLeafItems(prev => prev.filter(x => x.id !== leafItemId))
    } else {
      const newPos = (itemsByLeafId[toLeafId] || []).length
      const { error } = await supabase.from('leaf_items')
        .update({ leaf_id: toLeafId, position: newPos })
        .eq('id', leafItemId)
      if (!error) {
        setLeafItems(prev => prev.map(x => x.id === leafItemId ? { ...x, leaf_id: toLeafId, position: newPos } : x))
      }
    }
    setMoveMenuItemId(null)
  }

  async function removeLeafItem(leafItemId) {
    await supabase.from('leaf_items').delete().eq('id', leafItemId)
    setLeafItems(prev => prev.filter(x => x.id !== leafItemId))
  }

  // ── Saved-item removal (deletes from bag AND all leaves) ─────────
  async function removeSavedVideo(videoId) {
    if (!user) return
    await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', videoId)
    await supabase.from('leaf_items').delete().eq('user_id', user.id).eq('item_type', 'video').eq('item_id', String(videoId))
    setSavedVideos(prev => { const next = { ...prev }; delete next[videoId]; return next })
    setLeafItems(prev => prev.filter(li => !(li.item_type === 'video' && li.item_id === String(videoId))))
    removeFromCart(videoId, 'video')
  }

  async function removeSavedArticle(articleId) {
    if (!user) return
    await supabase.from('saved_articles').delete().eq('user_id', user.id).eq('article_id', articleId)
    await supabase.from('leaf_items').delete().eq('user_id', user.id).eq('item_type', 'article').eq('item_id', String(articleId))
    setSavedArticles(prev => { const next = { ...prev }; delete next[articleId]; return next })
    setLeafItems(prev => prev.filter(li => !(li.item_type === 'article' && li.item_id === String(articleId))))
    removeFromCart(articleId, 'article')
  }

  async function removeSavedAnswer(answerId) {
    if (!user) return
    await supabase.from('saved_answers').delete().eq('user_id', user.id).eq('id', answerId)
    await supabase.from('leaf_items').delete().eq('user_id', user.id).eq('item_type', 'answer').eq('item_id', String(answerId))
    setSavedAnswers(prev => { const next = { ...prev }; delete next[answerId]; return next })
    setLeafItems(prev => prev.filter(li => !(li.item_type === 'answer' && li.item_id === String(answerId))))
    removeFromCart(answerId, 'answer')
  }

  // ── Cart (🛺 My Plan) ────────────────────────────────────────────
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
    await supabase.from('cart_items').delete().eq('user_id', user.id).eq('item_id', String(itemId)).eq('item_type', itemType)
    setCartItems(prev => prev.filter(c => !(c.item_id === String(itemId) && c.item_type === itemType)))
  }

  async function clearCart() {
    if (!user) return
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    setCartItems([])
  }

  // ── DnD ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onItemsDragEnd(leafId) {
    return (e) => {
      const { active, over } = e
      if (!over || active.id === over.id) return
      const items = itemsByLeafId[leafId] || []
      const oldIdx = items.findIndex(i => i.id === active.id)
      const newIdx = items.findIndex(i => i.id === over.id)
      if (oldIdx < 0 || newIdx < 0) return
      const nextInLeaf = arrayMove(items, oldIdx, newIdx).map((li, i) => ({ ...li, position: i }))
      const nextAll = [
        ...leafItems.filter(li => li.leaf_id !== leafId),
        ...nextInLeaf,
      ]
      setLeafItems(nextAll)
      persistItemOrder(leafId, nextInLeaf)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function toggleCollapsed(leafId) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(leafId) ? next.delete(leafId) : next.add(leafId)
      return next
    })
  }

  function getYouTubeId(video) {
    if (video?.youtube_video_id) return video.youtube_video_id
    const m = video?.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  const totalSaved =
    Object.keys(savedVideos).length + Object.keys(savedArticles).length + Object.keys(savedAnswers).length
  const cartCount = cartItems.length

  if (!user) return null

  // ════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════
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
            <a href="/clubhouse" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">← Back</a>
            <span className="px-3 py-2 text-sm font-semibold text-green-800 border-b-2 border-green-700">Your Golf Bag</span>
            <a href="/golf-tv" className="px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors">Golf TV</a>
            <a href="/guides" className="px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors">Guides</a>
            <a href="/club-pro" className="px-3 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors">Club Pro</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {showCart && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">🛺 My Plan</h2>
            <CartPanel
              cartItems={cartItems}
              cartCount={cartCount}
              clearCart={clearCart}
              removeFromCart={removeFromCart}
              setShowCart={setShowCart}
              setPlayingVideoKey={setPlayingVideoKey}
              setOpenArticleKey={setOpenArticleKey}
              setOpenAnswerKey={setOpenAnswerKey}
            />
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">🏌️ Your Golf Bag</h2>
          <p className="text-gray-500 mt-1">
            {totalSaved} saved item{totalSaved !== 1 ? 's' : ''} across 5 buckets · Everything new lands in your Holding Bucket.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map(leaf => (
              <Bucket
                key={leaf.id}
                leaf={leaf}
                leaves={leaves}
                items={itemsByLeafId[leaf.id] || []}
                collapsed={collapsed.has(leaf.id)}
                toggleCollapsed={() => toggleCollapsed(leaf.id)}
                sensors={sensors}
                onItemsDragEnd={onItemsDragEnd(leaf.id)}
                savedVideos={savedVideos}
                savedArticles={savedArticles}
                savedAnswers={savedAnswers}
                moveItemToLeaf={moveItemToLeaf}
                removeLeafItem={removeLeafItem}
                removeSavedVideo={removeSavedVideo}
                removeSavedArticle={removeSavedArticle}
                removeSavedAnswer={removeSavedAnswer}
                moveMenuItemId={moveMenuItemId}
                setMoveMenuItemId={setMoveMenuItemId}
                playingVideoKey={playingVideoKey}
                setPlayingVideoKey={setPlayingVideoKey}
                openArticleKey={openArticleKey}
                setOpenArticleKey={setOpenArticleKey}
                openAnswerKey={openAnswerKey}
                setOpenAnswerKey={setOpenAnswerKey}
                isInCart={isInCart}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                getYouTubeId={getYouTubeId}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-8">
          Tip: tap <span className="font-semibold">Move ▾</span> on any item to send it to another bucket. Drag the ⋮⋮ handle to reorder items within a bucket.
        </p>
      </main>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Bucket (fixed, locked order — no drag, no rename, no delete)
// ════════════════════════════════════════════════════════════════════
function Bucket(props) {
  const {
    leaf, leaves, items, collapsed, toggleCollapsed,
    sensors, onItemsDragEnd,
    savedVideos, savedArticles, savedAnswers,
    moveItemToLeaf, removeLeafItem,
    removeSavedVideo, removeSavedArticle, removeSavedAnswer,
    moveMenuItemId, setMoveMenuItemId,
    playingVideoKey, setPlayingVideoKey,
    openArticleKey, setOpenArticleKey,
    openAnswerKey, setOpenAnswerKey,
    isInCart, addToCart, removeFromCart,
    getYouTubeId,
  } = props

  const meta = BUCKET_META[leaf.name] || { icon: '📁', hint: null }
  const isHolding = leaf.name === 'Holding Bucket'
  const itemIds = items.map(i => i.id)

  return (
    <div className={`border rounded-2xl bg-white ${isHolding ? 'border-yellow-300 ring-1 ring-yellow-100' : 'border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b rounded-t-2xl ${isHolding ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
        <button onClick={toggleCollapsed} className="text-gray-500 hover:text-gray-700 text-sm">
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="text-xl">{meta.icon}</span>
        <h3 className={`flex-1 font-bold text-base ${isHolding ? 'text-yellow-900' : 'text-gray-900'}`}>{leaf.name}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isHolding ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'}`}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {!collapsed && (
        <div className="p-3">
          {meta.hint && items.length > 0 && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">{meta.hint}</p>
          )}
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {isHolding
                ? 'Your Holding Bucket is empty. New saves from Golf TV, Guides, and Club Pro land here first.'
                : `Nothing in ${leaf.name} yet. Use the "Move ▾" button on any item in your Holding Bucket to send it here.`}
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemsDragEnd}>
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map(li => (
                    <SortableItem
                      key={li.id}
                      leafItem={li}
                      leaves={leaves}
                      savedVideos={savedVideos}
                      savedArticles={savedArticles}
                      savedAnswers={savedAnswers}
                      moveItemToLeaf={moveItemToLeaf}
                      removeLeafItem={removeLeafItem}
                      removeSavedVideo={removeSavedVideo}
                      removeSavedArticle={removeSavedArticle}
                      removeSavedAnswer={removeSavedAnswer}
                      moveMenuItemId={moveMenuItemId}
                      setMoveMenuItemId={setMoveMenuItemId}
                      playingVideoKey={playingVideoKey}
                      setPlayingVideoKey={setPlayingVideoKey}
                      openArticleKey={openArticleKey}
                      setOpenArticleKey={setOpenArticleKey}
                      openAnswerKey={openAnswerKey}
                      setOpenAnswerKey={setOpenAnswerKey}
                      isInCart={isInCart}
                      addToCart={addToCart}
                      removeFromCart={removeFromCart}
                      getYouTubeId={getYouTubeId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// SortableItem — single row inside a leaf
// ════════════════════════════════════════════════════════════════════
function SortableItem(props) {
  const {
    leafItem, leaves,
    savedVideos, savedArticles, savedAnswers,
    moveItemToLeaf, removeLeafItem,
    removeSavedVideo, removeSavedArticle, removeSavedAnswer,
    moveMenuItemId, setMoveMenuItemId,
    playingVideoKey, setPlayingVideoKey,
    openArticleKey, setOpenArticleKey,
    openAnswerKey, setOpenAnswerKey,
    isInCart, addToCart, removeFromCart,
    getYouTubeId,
  } = props

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: leafItem.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const key = `${leafItem.item_type}:${leafItem.item_id}`
  let content = null

  if (leafItem.item_type === 'video') {
    const saved = savedVideos[leafItem.item_id]
    if (!saved) {
      content = <MissingItemRow label="Video no longer in your bag" onCleanup={() => removeLeafItem(leafItem.id)} />
    } else {
      content = (
        <VideoRow
          saved={saved}
          playing={playingVideoKey === key}
          play={() => setPlayingVideoKey(key)}
          stop={() => setPlayingVideoKey(null)}
          removeSaved={() => removeSavedVideo(saved.video_id)}
          isInCart={isInCart}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          getYouTubeId={getYouTubeId}
        />
      )
    }
  } else if (leafItem.item_type === 'article') {
    const saved = savedArticles[leafItem.item_id]
    if (!saved) {
      content = <MissingItemRow label="Guide no longer in your bag" onCleanup={() => removeLeafItem(leafItem.id)} />
    } else {
      content = (
        <ArticleRow
          saved={saved}
          open={openArticleKey === key}
          toggle={() => setOpenArticleKey(openArticleKey === key ? null : key)}
          removeSaved={() => removeSavedArticle(saved.article_id)}
          isInCart={isInCart}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
        />
      )
    }
  } else if (leafItem.item_type === 'answer') {
    const saved = savedAnswers[leafItem.item_id]
    if (!saved) {
      content = <MissingItemRow label="Answer no longer in your bag" onCleanup={() => removeLeafItem(leafItem.id)} />
    } else {
      content = (
        <AnswerRow
          saved={saved}
          open={openAnswerKey === key}
          toggle={() => setOpenAnswerKey(openAnswerKey === key ? null : key)}
          removeSaved={() => removeSavedAnswer(saved.id)}
          isInCart={isInCart}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
        />
      )
    }
  }

  const otherLeaves = leaves.filter(l => l.id !== leafItem.leaf_id)

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2 border border-gray-100 rounded-xl overflow-hidden hover:border-green-200 transition-colors">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-2 touch-none bg-gray-50 border-r border-gray-100"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0">{content}</div>
      <div className="flex flex-col items-end justify-between gap-1 px-2 py-2 border-l border-gray-100 bg-gray-50/50 relative">
        <button
          onClick={() => setMoveMenuItemId(moveMenuItemId === leafItem.id ? null : leafItem.id)}
          className="text-xs text-gray-400 hover:text-gray-700 whitespace-nowrap"
          title="Move to another leaf"
        >
          Move ▾
        </button>
        {moveMenuItemId === leafItem.id && (
          <div className="absolute top-8 right-2 z-30 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[14rem] max-h-none overflow-visible">
            {otherLeaves.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">No other leaves yet</p>
            ) : otherLeaves.map(l => (
              <button
                key={l.id}
                onClick={() => moveItemToLeaf(leafItem.id, l.id)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800"
              >
                → {l.name}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { removeLeafItem(leafItem.id); setMoveMenuItemId(null) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-700"
            >
              Remove from this leaf
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Row components (video, article, answer, missing)
// ════════════════════════════════════════════════════════════════════
function VideoRow({ saved, playing, play, stop, removeSaved, isInCart, addToCart, removeFromCart, getYouTubeId }) {
  const video = saved.videos
  const ytId = getYouTubeId(video)
  const videoUrl = video.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : null)
  return (
    <div>
      {playing && ytId ? (
        <div>
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button onClick={stop} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
          </div>
          <div className="p-3 flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm flex-1 line-clamp-1">{video.title}</p>
            <CartButton itemId={saved.video_id} itemType="video" itemTitle={video.title} isInCart={isInCart} addToCart={addToCart} removeFromCart={removeFromCart} />
            <button onClick={removeSaved} className="text-xs text-red-400 hover:text-red-600">Remove</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3">
          <button onClick={play} className="relative shrink-0">
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
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <CartButton itemId={saved.video_id} itemType="video" itemTitle={video.title} isInCart={isInCart} addToCart={addToCart} removeFromCart={removeFromCart} />
            <button onClick={removeSaved} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ArticleRow({ saved, open, toggle, removeSaved, isInCart, addToCart, removeFromCart }) {
  const article = saved.articles
  return (
    <div>
      <div className="flex items-start gap-3 p-3">
        <button onClick={toggle} className="flex-1 text-left min-w-0">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">📖 Guide</span>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mt-1 hover:text-green-700 line-clamp-2">{article.title}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
          <span className="text-xs text-green-700 mt-1 inline-block">{open ? 'Close ▲' : 'Read ▼'}</span>
        </button>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <CartButton itemId={saved.article_id} itemType="article" itemTitle={article.title} isInCart={isInCart} addToCart={addToCart} removeFromCart={removeFromCart} />
          <button onClick={removeSaved} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
        </div>
      </div>
      {open && article.content && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <div
            className="text-sm text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: (article.content || '').split('\n\n').join('</p><p class="mb-3">').split('\n').join('<br/>') }}
          />
        </div>
      )}
    </div>
  )
}

function AnswerRow({ saved, open, toggle, removeSaved, isInCart, addToCart, removeFromCart }) {
  return (
    <div>
      <div className="flex items-start gap-3 p-3">
        <button onClick={toggle} className="flex-1 text-left min-w-0">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🤖 Club Pro Answer</span>
          <p className="font-semibold text-gray-900 text-sm mt-1 hover:text-green-700 line-clamp-2">{saved.question}</p>
          <span className="text-xs text-green-700 mt-1 inline-block">{open ? 'Close ▲' : 'Read ▼'}</span>
        </button>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <CartButton itemId={saved.id} itemType="answer" itemTitle={saved.question} isInCart={isInCart} addToCart={addToCart} removeFromCart={removeFromCart} />
          <button onClick={removeSaved} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{saved.answer}</p>
        </div>
      )}
    </div>
  )
}

function MissingItemRow({ label, onCleanup }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="flex-1">
        <p className="text-sm text-gray-400 italic">{label}</p>
      </div>
      <button onClick={onCleanup} className="text-xs text-red-400 hover:text-red-600 font-semibold">Clean up</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// CartButton / CartPanel
// ════════════════════════════════════════════════════════════════════
function CartButton({ itemId, itemType, itemTitle, isInCart, addToCart, removeFromCart }) {
  const inCart = isInCart(itemId, itemType)
  return (
    <button
      onClick={() => inCart ? removeFromCart(itemId, itemType) : addToCart(itemId, itemType, itemTitle)}
      className={`text-xs font-semibold transition-colors px-2 py-1 rounded-lg whitespace-nowrap ${
        inCart ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700'
      }`}
    >
      {inCart ? '🛺 Added' : '🛺 Add'}
    </button>
  )
}

function CartPanel({ cartItems, cartCount, clearCart, removeFromCart, setShowCart, setPlayingVideoKey, setOpenArticleKey, setOpenAnswerKey }) {
  if (cartCount === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-yellow-200 rounded-xl bg-yellow-50">
        <p className="text-3xl mb-2">🛺</p>
        <p className="text-sm font-semibold text-yellow-800">Your plan is empty</p>
        <p className="text-xs text-yellow-600 mt-1">Tap "🛺 Add" on any item in your bag to load today's focus.</p>
      </div>
    )
  }
  return (
    <div className="border border-yellow-300 rounded-xl bg-yellow-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200">
        <div>
          <p className="text-sm font-bold text-yellow-900">🛺 My Plan — {cartCount} item{cartCount !== 1 ? 's' : ''} loaded</p>
          <p className="text-xs text-yellow-600 mt-0.5">You're prioritizing items from your bag — nothing leaves your bag.</p>
        </div>
        <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 font-semibold whitespace-nowrap ml-3">Clear All</button>
      </div>
      <div className="divide-y divide-yellow-100">
        {cartItems.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg">
              {item.item_type === 'video' ? '🎬' : item.item_type === 'article' ? '📖' : '🤖'}
            </span>
            <button
              onClick={() => {
                setShowCart(false)
                const key = `${item.item_type}:${item.item_id}`
                if (item.item_type === 'video') setPlayingVideoKey(key)
                else if (item.item_type === 'article') setOpenArticleKey(key)
                else if (item.item_type === 'answer') setOpenAnswerKey(key)
                setTimeout(() => {
                  document.querySelector(`[data-leaf-item-key="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 150)
              }}
              className="flex-1 text-sm font-medium text-green-700 hover:underline text-left line-clamp-1"
            >
              {item.item_title}
            </button>
            <button onClick={() => removeFromCart(item.item_id, item.item_type)} className="text-xs text-gray-400 hover:text-red-500 shrink-0 font-semibold">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
