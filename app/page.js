'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

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
            <a href="/welcome" className="text-green-200 text-sm border border-green-600 rounded-xl px-4 py-1.5 hover:bg-green-700 transition-colors">
              MyClubHouse →
            </a>
          ) : (
            <a href="/login" className="text-green-200 text-sm border border-green-600 rounded-xl px-4 py-1.5 hover:bg-green-700 transition-colors">
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-lg mx-auto w-full px-6 py-12 flex flex-col items-center text-center">

        {/* Welcome icon */}
        <div className="w-20 h-20 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mb-6">
          <span style={{fontSize: '40px'}}>⛳</span>
        </div>

        {/* Personalized greeting or generic */}
        {userName ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
              Welcome back, {userName}!
            </h1>
            <p className="text-gray-500 text-base mb-8 leading-relaxed">
              Your ClubHouse is ready — videos, guides, and your AI pro are waiting inside.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
              Welcome to<br />MyGolf Companion
            </h1>
            <p className="text-gray-500 text-base mb-8 leading-relaxed">
              Your ClubHouse is waiting.<br />
              767 videos and expert guides — matched to your game by AI.
            </p>
          </>
        )}

        {/* Primary CTA */}
        <a
          href={user ? '/welcome' : '/login'}
          className="w-full py-4 bg-green-700 text-white rounded-2xl text-lg font-semibold hover:bg-green-800 transition-colors text-center block mb-3"
        >
          ⛳ Drive to MyClubHouse
        </a>

        {!user && (
          <p className="text-sm text-gray-400">
            Sign in or create a free account to get started
          </p>
        )}

        {/* Stats — scorecard style */}
        <div className="w-full mt-12 border border-gray-200 rounded-2xl overflow-hidden">
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