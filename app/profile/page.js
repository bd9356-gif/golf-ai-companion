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
  const [loading, setLoading] = useState(true)
  const [skillLevel, setSkillLevel] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      setSkillLevel(localStorage.getItem('golf_skill_level') || '')

      // Load saved videos with full video details
      const { data } = await supabase
        .from('saved_videos')
        .select(`
          video_id,
          created_at,
          videos (
            id, title, url, thumbnail_url, youtube_video_id, channel_name
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (data) setSavedVideos(data.filter(s => s.videos))
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

        {/* Profile card */}
        <div className="mb-8 p-6 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4">
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

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 border border-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-green-700">{savedVideos.length}</p>
            <p className="text-sm text-gray-500 mt-1">Saved Videos</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-green-700">{skillLevel ? '1' : '0'}</p>
            <p className="text-sm text-gray-500 mt-1">Active Plan</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-green-700">⛳</p>
            <p className="text-sm text-gray-500 mt-1">Member</p>
          </div>
        </div>

        {/* Saved Videos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">🔖 Saved Videos</h2>
            {savedVideos.length > 0 && (
              <a href="/plan" className="text-sm text-green-700 hover:underline">View in Plan →</a>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedVideos.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
              <p className="text-3xl mb-2">🔖</p>
              <p className="text-gray-500 font-medium">No saved videos yet</p>
              <p className="text-sm text-gray-400 mt-1">Save videos from your plan to see them here</p>
              <a href="/plan" className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">Go to My Plan →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {savedVideos.map((saved) => {
                const video = saved.videos
                const ytId = getYouTubeId(video)
                return (
                  <a
                    key={saved.video_id}
                    href="/plan"
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-green-200 hover:bg-green-50 transition-colors"
                  >
                    {ytId && (
                      <img
                        src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-20 h-14 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{video.title}</p>
                      {video.channel_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{video.channel_name}</p>
                      )}
                    </div>
                    <span className="text-gray-400 shrink-0">▶</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}