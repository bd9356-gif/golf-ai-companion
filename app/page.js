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
  { stat: '40+', label: 'Expert Articles' },
  { stat: 'AI', label: 'Personalized Plans' },
]

export default function HomePage() {
  const [hasPlan, setHasPlan] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const level = localStorage.getItem('golf_skill_level')
    if (level) setHasPlan(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My Profile'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-sm text-gray-500">Your AI guide to better golf</p>
          </div>
          {user ? (
            <a href="/profile" className="text-sm font-semibold text-green-700 hover:underline">
              👤 {userName}
            </a>
          ) : (
            <a href="/login" className="text-sm font-semibold text-green-700 border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50 transition-colors">
              Sign In
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-2">
          <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
            AI-Powered Golf Instruction
          </span>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2 leading-tight">Play Better Golf.</h2>
          <h2 className="text-4xl font-bold text-green-700 mb-4 leading-tight">Starting Today.</h2>
          <p className="text-base text-gray-500 max-w-md mx-auto">
            767 curated instruction videos and expert articles — matched to your skill level by AI. From beginner basics to advanced shot shaping.
          </p>
        </div>

        <div className="space-y-3 mb-8">

          <a href="/videos" className="block w-full px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors text-center">
            Browse Videos
          </a>
          <a href="/learn" className="block w-full px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors text-center">
            📖 Read Articles
          </a>
          <a href="/videos?tab=ask" className="block w-full px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors text-center">
            🤖 Ask MyGolf AI
          </a>
          {hasPlan && (
            <a href="/plan" className="block w-full px-6 py-3 border-2 border-green-200 text-green-700 rounded-xl font-semibold text-base hover:bg-green-50 transition-colors text-center">
              🎯 MyGolf Plan
            </a>
          )}
          <a href="/about" className="block w-full px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors text-center">
            ℹ️ About
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {STATS.map(({ stat, label }) => (
            <div key={label} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-green-700">{stat}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
