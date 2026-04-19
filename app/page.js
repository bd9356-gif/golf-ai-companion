'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const COURSE_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop', name: 'Morning Round' },
  { url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80&fit=crop', name: 'Golden Hour' },
  { url: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80&fit=crop', name: 'Fairway at Dawn' },
  { url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop', name: 'The Approach' },
  { url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80&fit=crop', name: 'Links Course' },
  { url: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80&fit=crop', name: 'Sunset Green' },
  { url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop', name: 'Early Morning Tee' },
]

function getDailyImage() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return COURSE_IMAGES[dayOfYear % COURSE_IMAGES.length]
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATS = [
  { stat: '767', label: 'Instruction Videos' },
  { stat: '6', label: 'Skill Levels' },
  { stat: '40+', label: 'Expert Guides' },
  { stat: 'AI', label: 'Personalized Plans' },
]

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [skillLevel, setSkillLevel] = useState(null)

  useEffect(() => {
    const level = localStorage.getItem('golf_skill_level')
    if (level) setSkillLevel(level)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || null

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="bg-green-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <span className="text-green-100 text-lg font-semibold">MyGolf Companion</span>
          </div>
          {user ? (
            <a href="/clubhouse" className="text-green-200 text-sm border border-green-600 rounded-xl px-4 py-1.5 hover:bg-green-700 transition-colors">
              MyClubhouse →
            </a>
          ) : (
            <a href="/login" className="text-green-200 text-sm border border-green-600 rounded-xl px-4 py-1.5 hover:bg-green-700 transition-colors">
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-lg mx-auto w-full px-6 pt-2 pb-12 flex flex-col items-center text-center">

        {/* Hero image with text overlay */}
        <div className="w-full rounded-2xl overflow-hidden mb-6 relative" style={{height: '240px'}}>
          <img
            src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop"
            alt="Golf course"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40 rounded-2xl" />
          {/* Text on top of image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {userName ? (
              <>
                <h1 className="text-2xl font-bold text-white mb-1 leading-tight drop-shadow">
                  Welcome back, {userName}!
                </h1>
                <p className="text-green-200 text-sm leading-relaxed drop-shadow">
                  Your ClubHouse is ready — let's play.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white mb-1 leading-tight drop-shadow">
                  Welcome to MyGolf Companion
                </h1>
                <p className="text-green-200 text-sm leading-relaxed drop-shadow">
                  Your ClubHouse is waiting. 767 videos matched to your game.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Primary CTA */}
        <a
          href={user ? '/clubhouse' : '/login'}
          className="w-full py-4 bg-green-700 text-white rounded-2xl text-lg font-semibold hover:bg-green-800 transition-colors text-center block mb-3"
        >
          ⛳ Drive to MyClubhouse
        </a>

        {!user && (
          <p className="text-sm text-gray-400">
            Sign in or create a free account to get started
          </p>
        )}

        {/* Stats — scorecard style */}
        <div className="w-full mt-8 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-green-800 px-4 py-2">
            <p className="text-green-200 text-xs font-semibold tracking-wider text-center uppercase">Course Card</p>
          </div>
          <div className="grid grid-cols-2">
            {STATS.map(({ stat, label }, i) => (
              <div
                key={label}
                className={`p-5 text-center ${
                  i % 2 === 0 ? 'border-r border-gray-200' : ''
                } ${i >= 2 ? 'border-t border-gray-200' : ''}`}
              >
                <p className="text-2xl font-bold text-green-700">{stat}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About link */}
        <a href="/about" className="mt-8 text-sm text-gray-400 hover:text-gray-600">
          About MyGolf Companion →
        </a>

      </main>
    </div>
  )
}