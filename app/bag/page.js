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
import SafeYouTube from '@/components/SafeYouTube'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Fixed, locked 5-skill structure. Order is enforced.
// Note: 'Holding Bucket' is the DB name (kept for back-compat); the user-facing
// label is 'The Starter'.
const FIXED_BUCKETS = [
  { name: 'Holding Bucket',    label: 'The Starter',      position: 0, icon: '📥', hint: 'New saves start here. Sort into Full Swing, Short Game, Putting, or Course Management.' },
  { name: 'Full Swing',        label: 'Full Swing',        position: 1, icon: '🏌️', hint: null },
  { name: 'Short Game',        label: 'Short Game',        position: 2, icon: '🪓', hint: null },
  { name: 'Putting',           label: 'Putting',           position: 3, icon: '⛳', hint: null },
  { name: 'Course Management', label: 'Course Management', position: 4, icon: '🗺️', hint: null },
]
const BUCKET_META = Object.fromEntries(FIXED_BUCKETS.map(b => [b.name, b]))
const labelFor = (name) => BUCKET_META[name]?.label || name

// Per-skill color scheme. Each bucket paints its own open area so you can
// tell at a glance which skill you're inside. Tailwind classes are written
// out as full strings so the v4 scanner can pick them up.
const BUCKET_COLORS = {
  'Holding Bucket': {
    outer: 'border-yellow-300',
    headerBg: 'bg-yellow-50',
    headerBorder: 'border-yellow-200',
    title: 'text-yellow-900',
    pill: 'bg-yellow-200 text-yellow-800',
    ring: 'ring-yellow-200',
    bodyBg: 'bg-yellow-50/40',
    hint: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  },
  'Full Swing': {
    outer: 'border-green-300',
    headerBg: 'bg-green-50',
    headerBorder: 'border-green-200',
    title: 'text-green-900',
    pill: 'bg-green-200 text-green-800',
    ring: 'ring-green-200',
    bodyBg: 'bg-green-50/40',
    hint: 'bg-green-50 border-green-200 text-green-700',
  },
  'Short Game': {
    outer: 'border-orange-300',
    headerBg: 'bg-orange-50',
    headerBorder: 'border-orange-200',
    title: 'text-orange-900',
    pill: 'bg-orange-200 text-orange-800',
    ring: 'ring-orange-200',
    bodyBg: 'bg-orange-50/40',
    hint: 'bg-orange-50 border-orange-200 text-orange-700',
  },
  'Putting': {
    outer: 'border-sky-300',
    headerBg: 'bg-sky-50',
    headerBorder: 'border-sky-200',
    title: 'text-sky-900',
    pill: 'bg-sky-200 text-sky-800',
    ring: 'ring-sky-200',
    bodyBg: 'bg-sky-50/40',
    hint: 'bg-sky-50 border-sky-200 text-sky-700',
  },
  'Course Management': {
    outer: 'border-purple-300',
    headerBg: 'bg-purple-50',
    headerBorder: 'border-purple-200',
    title: 'text-purple-900',
    pill: 'bg-purple-200 text-purple-800',
    ring: 'ring-purple-200',
    bodyBg: 'bg-purple-50/40',
    hint: 'bg-purple-50 border-purple-200 text-purple-700',
  },
}
const colorsFor = (name) => BUCKET_COLORS[name] || BUCKET_COLORS['Holding Bucket']

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
  const [doneCartIds, setDoneCartIds] = useState(new Set()) // session-only ✓ checkmarks
  const [practiceIdx, setPracticeIdx] = useState(null)       // null = off; number = active item index
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
        .select('video_id, created_at, skill_level, videos(id, title, url, thumbnail_url, youtube_video_id, channel_name, description)')
        .eq('user_id', userId),
      supabase.from('saved_articles')
        .select('article_id, created_at, skill_level, articles(id, title, summary, topic, read_time_minutes, content)')
        .eq('user_id', userId),
      supabase.from('saved_answers')
        .select('id, question, answer, created_at, skill_level')
        .eq('user_id', userId),
      supabase.from('cart_items').select('*').eq('user_id', userId).order('position', { ascending: true }).order('created_at', { ascending: false }),
    ])

    const loadedLeaves = leavesRes.data || []
    setLeaves(loadedLeaves)
    setLeafItems(leafItemsRes.data || [])
    // Default all skills collapsed on page open — user expands what they want.
    setCollapsed(new Set(loadedLeaves.map(l => l.id)))

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
    // Prepend new items — they get the smallest position so they sort first.
    // The drag-reorder handler normalizes to 0..n-1 on any drag.
    const minPos = cartItems.length > 0 ? Math.min(...cartItems.map(c => c.position ?? 0)) : 0
    const { data, error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      item_id: String(itemId),
      item_type: itemType,
      item_title: itemTitle,
      position: minPos - 1,
    }).select().single()
    if (!error && data) {
      setCartItems(prev => [data, ...prev])
      // Auto-open the Plan panel so the user sees the item they just added,
      // already expanded at the top, ready to watch/read.
      setShowCart(true)
    }
  }

  async function removeFromCart(itemId, itemType) {
    if (!user) return
    // Find the cart row so we can also clear its done flag (session-only).
    const row = cartItems.find(c => c.item_id === String(itemId) && c.item_type === itemType)
    await supabase.from('cart_items').delete().eq('user_id', user.id).eq('item_id', String(itemId)).eq('item_type', itemType)
    setCartItems(prev => prev.filter(c => !(c.item_id === String(itemId) && c.item_type === itemType)))
    if (row) {
      setDoneCartIds(prev => {
        const next = new Set(prev); next.delete(row.id); return next
      })
    }
  }

  async function clearCart() {
    if (!user) return
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    setCartItems([])
    setDoneCartIds(new Set())
  }

  function toggleCartDone(cartItemId) {
    setDoneCartIds(prev => {
      const next = new Set(prev)
      next.has(cartItemId) ? next.delete(cartItemId) : next.add(cartItemId)
      return next
    })
  }

  async function onCartDragEnd(e) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = cartItems.findIndex(c => c.id === active.id)
    const newIdx = cartItems.findIndex(c => c.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const next = arrayMove(cartItems, oldIdx, newIdx).map((c, i) => ({ ...c, position: i }))
    setCartItems(next)
    const rows = next.map(c => ({
      id: c.id,
      user_id: c.user_id,
      item_id: c.item_id,
      item_type: c.item_type,
      item_title: c.item_title,
      position: c.position,
    }))
    await supabase.from('cart_items').upsert(rows)
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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a
            href="/clubhouse"
            className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0"
            aria-label="Back to Clubhouse"
          >
            ← Clubhouse
          </a>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">🏌️</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">Your Golf Bag</h1>
              <p className="text-xs text-green-700 font-semibold leading-tight">
                {totalSaved} saved · 5 skills
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCart(s => !s)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-colors shrink-0 ${
              showCart ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-gray-200 text-gray-600 hover:border-yellow-300'
            }`}
            aria-label="My Plan"
          >
            <span className="text-base">🛺</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
            <span className="text-xs font-semibold hidden sm:inline">My Plan</span>
          </button>
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
              savedVideos={savedVideos}
              savedArticles={savedArticles}
              savedAnswers={savedAnswers}
              getYouTubeId={getYouTubeId}
              doneCartIds={doneCartIds}
              toggleCartDone={toggleCartDone}
              sensors={sensors}
              onCartDragEnd={onCartDragEnd}
              startPractice={() => setPracticeIdx(0)}
            />
          </div>
        )}

        <div className="mb-5">
          <p className="text-sm text-gray-500">
            New saves wait at The Starter until you move them into a skill.
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
          Tip: tap <span className="font-semibold">Move ▾</span> on any item to send it to another skill. Drag the ⋮⋮ handle to reorder items within a skill.
        </p>
      </main>

      {practiceIdx !== null && cartItems[practiceIdx] && (
        <PracticeOverlay
          items={cartItems}
          idx={practiceIdx}
          setIdx={setPracticeIdx}
          close={() => setPracticeIdx(null)}
          savedVideos={savedVideos}
          savedArticles={savedArticles}
          savedAnswers={savedAnswers}
          getYouTubeId={getYouTubeId}
          doneCartIds={doneCartIds}
          toggleCartDone={toggleCartDone}
        />
      )}
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
  const color = colorsFor(leaf.name)

  return (
    <div className={`border-2 rounded-2xl bg-white transition-all ${color.outer} ${!collapsed ? `ring-2 ${color.ring}` : ''}`}>
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl ${color.headerBg} ${!collapsed ? `border-b ${color.headerBorder}` : 'rounded-b-2xl'}`}>
        <button onClick={toggleCollapsed} className={`text-sm ${color.title} opacity-70 hover:opacity-100`}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="text-xl">{meta.icon}</span>
        <h3 className={`flex-1 font-bold text-base ${color.title}`}>{labelFor(leaf.name)}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.pill}`}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {!collapsed && (
        <div className={`p-3 rounded-b-2xl ${color.bodyBg}`}>
          {meta.hint && items.length > 0 && (
            <p className={`text-xs border rounded-lg px-3 py-2 mb-3 ${color.hint}`}>{meta.hint}</p>
          )}
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {isHolding
                ? 'The Starter is empty. New saves from Golf TV, Guides, and Club Pro land here first.'
                : `Nothing in ${labelFor(leaf.name)} yet. Use the "Move ▾" button on any item in The Starter to send it here.`}
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
// DragHandle — shared, thumb-friendly drag grip used across sortables
// ════════════════════════════════════════════════════════════════════
// A 6-dot grip icon (universal "drag me" pattern) with a generous tap
// target (~44px wide on mobile) and strong contrast. Attach dnd-kit's
// attributes + listeners directly on the button.
function DragHandle({ attributes, listeners, variant = 'side' }) {
  // "side" → full-height left strip (used in leaf rows)
  // "inline" → self-contained button (used at the top of cart items)
  const base =
    'cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center ' +
    'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 hover:text-gray-800 ' +
    'transition-colors'
  const shape = variant === 'inline'
    ? 'w-9 h-9 rounded-lg shrink-0'
    : 'w-11 self-stretch border-r border-gray-200 rounded-l-xl'
  return (
    <button
      {...attributes}
      {...listeners}
      className={`${base} ${shape}`}
      aria-label="Drag to reorder"
      title="Drag to reorder"
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
        <circle cx="4" cy="3" r="1.5" />
        <circle cx="4" cy="9" r="1.5" />
        <circle cx="4" cy="15" r="1.5" />
        <circle cx="10" cy="3" r="1.5" />
        <circle cx="10" cy="9" r="1.5" />
        <circle cx="10" cy="15" r="1.5" />
      </svg>
    </button>
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
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2 border border-gray-100 rounded-xl hover:border-green-200 transition-colors">
      <DragHandle attributes={attributes} listeners={listeners} variant="side" />
      <div className="flex-1 min-w-0">{content}</div>
      <div className="flex flex-col items-end justify-between gap-1 px-2 py-2 border-l border-gray-100 bg-gray-50/50 relative rounded-r-xl">
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
                → {labelFor(l.name)}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { removeLeafItem(leafItem.id); setMoveMenuItemId(null) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-700"
            >
              Remove from this skill
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
  return (
    <div className="flex flex-col">
      {/* Top: video frame (player or playable thumbnail) — full width */}
      {playing && ytId ? (
        <SafeYouTube videoId={ytId} onClose={stop} />
      ) : ytId ? (
        <button onClick={play} className="relative w-full block group" aria-label={`Play ${video.title}`}>
          <img
            src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt={video.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </button>
      ) : null}

      {/* Below: title, channel, description, actions — full width */}
      <div className="p-3">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🎬 Video</span>
        <p className="font-semibold text-gray-900 text-sm leading-snug mt-1 break-words">{video.title}</p>
        {video.channel_name && <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>}
        {video.description && (
          <p className="text-xs text-gray-600 mt-2 leading-relaxed whitespace-pre-line line-clamp-4">{video.description}</p>
        )}
        <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
          <CartButton itemId={saved.video_id} itemType="video" itemTitle={video.title} isInCart={isInCart} addToCart={addToCart} removeFromCart={removeFromCart} />
          <button onClick={removeSaved} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
        </div>
      </div>
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

function CartPanel({
  cartItems, cartCount, clearCart, removeFromCart,
  savedVideos, savedArticles, savedAnswers, getYouTubeId,
  doneCartIds, toggleCartDone,
  sensors, onCartDragEnd,
  startPractice,
}) {
  if (cartCount === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-yellow-200 rounded-xl bg-yellow-50">
        <p className="text-3xl mb-2">🛺</p>
        <p className="text-sm font-semibold text-yellow-800">Your plan is empty</p>
        <p className="text-xs text-yellow-600 mt-1">Tap &ldquo;🛺 Add&rdquo; on any item in your bag to load today&rsquo;s focus.</p>
      </div>
    )
  }
  const doneCount = cartItems.filter(c => doneCartIds.has(c.id)).length
  const itemIds = cartItems.map(c => c.id)

  return (
    <div className="border border-yellow-300 rounded-xl bg-yellow-50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-yellow-200">
        <div className="min-w-0">
          <p className="text-sm font-bold text-yellow-900">
            🛺 My Plan — {doneCount} of {cartCount} done
          </p>
          <p className="text-xs text-yellow-600 mt-0.5">Drag ⋮⋮ to reorder · ✓ to mark done · ▶ for focus mode</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={startPractice}
            className="text-xs font-semibold bg-green-700 text-white hover:bg-green-800 rounded-lg px-3 py-1.5 whitespace-nowrap"
            title="Go through your plan one item at a time, full-screen"
          >
            ▶ Start practice
          </button>
          <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 font-semibold whitespace-nowrap">Clear All</button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCartDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-yellow-200 bg-white">
            {cartItems.map((item, idx) => (
              <CartItem
                key={item.id}
                item={item}
                index={idx}
                savedVideos={savedVideos}
                savedArticles={savedArticles}
                savedAnswers={savedAnswers}
                getYouTubeId={getYouTubeId}
                removeFromCart={removeFromCart}
                isDone={doneCartIds.has(item.id)}
                toggleDone={() => toggleCartDone(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// One row inside My Plan — renders the item fully expanded (video playable,
// article/answer body visible) so added items open immediately.
// On narrow screens only the first item auto-expands; others start collapsed
// so the Plan stays scannable.
function CartItem({ item, index, savedVideos, savedArticles, savedAnswers, getYouTubeId, removeFromCart, isDone, toggleDone }) {
  const [playing, setPlaying] = useState(false)
  // Default: every item starts collapsed. The Plan should be a clean ordered
  // list at first glance — the user taps ▼ to open whatever they're working on.
  const [collapsed, setCollapsed] = useState(true)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const typeLabel =
    item.item_type === 'video' ? '🎬 Video' :
    item.item_type === 'article' ? '📖 Guide' :
    '🤖 Club Pro Answer'

  return (
    <div ref={setNodeRef} style={style} className={`p-4 ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <DragHandle attributes={attributes} listeners={listeners} variant="inline" />
        <div className="flex-1 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            item.item_type === 'video' ? 'bg-blue-100 text-blue-700' :
            item.item_type === 'article' ? 'bg-purple-100 text-purple-700' :
            'bg-green-100 text-green-700'
          }`}>{typeLabel}</span>
          <h3 className={`font-semibold text-gray-900 text-sm mt-1.5 break-words ${isDone ? 'line-through text-gray-500' : ''}`}>
            {item.item_title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleDone}
            className={`text-sm font-semibold transition-colors rounded-full w-7 h-7 flex items-center justify-center ${
              isDone
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
            }`}
            title={isDone ? 'Mark not done' : 'Mark done'}
            aria-label={isDone ? 'Mark not done' : 'Mark done'}
          >
            ✓
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-xs text-gray-400 hover:text-gray-700 font-semibold"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
          <button
            onClick={() => removeFromCart(item.item_id, item.item_type)}
            className="text-xs text-red-400 hover:text-red-600 font-semibold"
            title="Remove from plan"
          >
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <CartItemBody
          item={item}
          playing={playing}
          setPlaying={setPlaying}
          savedVideos={savedVideos}
          savedArticles={savedArticles}
          savedAnswers={savedAnswers}
          getYouTubeId={getYouTubeId}
        />
      )}
    </div>
  )
}

// Renders the actual video / article / answer content for one plan item.
// Shared between CartItem (inline in the Plan) and PracticeOverlay (focus mode).
function CartItemBody({ item, playing, setPlaying, savedVideos, savedArticles, savedAnswers, getYouTubeId, autoPlayVideo = false }) {
  if (item.item_type === 'video') {
    const saved = savedVideos[item.item_id]
    const video = saved?.videos
    if (!video) return <p className="text-xs text-gray-400 italic">This video is no longer in your bag.</p>
    const ytId = getYouTubeId(video)
    const shouldPlay = playing || autoPlayVideo
    return (
      <div className="rounded-lg overflow-hidden border border-gray-100">
        {shouldPlay && ytId ? (
          <SafeYouTube videoId={ytId} onClose={setPlaying ? () => setPlaying(false) : undefined} />
        ) : ytId ? (
          <button onClick={() => setPlaying && setPlaying(true)} className="relative w-full block group" aria-label={`Play ${video.title}`}>
            <img
              src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
              alt={video.title}
              className="w-full aspect-video object-cover"
            />
            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors flex items-center justify-center">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-800 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          </button>
        ) : (
          <p className="text-xs text-gray-500 p-3">Video unavailable.</p>
        )}
        {video.channel_name && <p className="text-xs text-gray-500 px-2 pt-2">{video.channel_name}</p>}
      </div>
    )
  }
  if (item.item_type === 'article') {
    const saved = savedArticles[item.item_id]
    const article = saved?.articles
    if (!article) return <p className="text-xs text-gray-400 italic">This guide is no longer in your bag.</p>
    return (
      <div>
        {article.summary && <p className="text-xs text-gray-500 mb-2">{article.summary}</p>}
        {article.content && (
          <div
            className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: '<p class="mb-3">' + (article.content || '').split('\n\n').join('</p><p class="mb-3">').split('\n').join('<br/>') + '</p>' }}
          />
        )}
      </div>
    )
  }
  // answer
  const saved = savedAnswers[item.item_id]
  if (!saved) return <p className="text-xs text-gray-400 italic">This answer is no longer in your bag.</p>
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2"><span className="font-semibold">You asked:</span> {saved.question}</p>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{saved.answer}</p>
    </div>
  )
}

// Full-screen distraction-free mode — one plan item at a time with Next/Prev.
function PracticeOverlay({ items, idx, setIdx, close, savedVideos, savedArticles, savedAnswers, getYouTubeId, doneCartIds, toggleCartDone }) {
  const item = items[idx]
  const total = items.length
  const isFirst = idx === 0
  const isLast = idx === total - 1
  const isDone = doneCartIds.has(item.id)

  const typeLabel =
    item.item_type === 'video' ? '🎬 Video' :
    item.item_type === 'article' ? '📖 Guide' :
    '🤖 Club Pro Answer'

  // Keyboard shortcuts: ← prev, → next, Esc close
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft' && !isFirst) setIdx(idx - 1)
      else if (e.key === 'ArrowRight' && !isLast) setIdx(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, isFirst, isLast, close, setIdx])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800 text-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-yellow-400">🛺 Practice</span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{idx + 1} of {total}</span>
        </div>
        <button
          onClick={close}
          className="text-gray-300 hover:text-white text-sm font-semibold bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5 whitespace-nowrap"
          aria-label="Close practice"
        >
          ✕ Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                item.item_type === 'video' ? 'bg-blue-900 text-blue-200' :
                item.item_type === 'article' ? 'bg-purple-900 text-purple-200' :
                'bg-green-900 text-green-200'
              }`}>{typeLabel}</span>
              <h2 className={`text-lg sm:text-xl font-bold text-white mt-2 break-words ${isDone ? 'line-through text-gray-400' : ''}`}>
                {item.item_title}
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4">
            <CartItemBody
              item={item}
              playing={true}
              setPlaying={null}
              autoPlayVideo={item.item_type === 'video'}
              savedVideos={savedVideos}
              savedArticles={savedArticles}
              savedAnswers={savedAnswers}
              getYouTubeId={getYouTubeId}
            />
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-gray-800 bg-black/80 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => setIdx(idx - 1)}
            disabled={isFirst}
            className="text-sm font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg px-4 py-2"
          >
            ← Prev
          </button>
          <button
            onClick={() => {
              toggleCartDone(item.id)
              if (!isDone && !isLast) setIdx(idx + 1)
            }}
            className={`text-sm font-semibold rounded-lg px-4 py-2 ${
              isDone
                ? 'bg-green-900 text-green-200 hover:bg-green-800'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isDone ? '✓ Done (tap to undo)' : '✓ Mark done & next'}
          </button>
          <button
            onClick={() => setIdx(idx + 1)}
            disabled={isLast}
            className="text-sm font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg px-4 py-2"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
