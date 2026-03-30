'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const TIER_LABELS = {
  beginner: 'Beginner',
  building_game: 'Building Your Game',
  building_consistency: 'Building Consistency',
  improving_player: 'Improving Player',
  advanced_player: 'Advanced Player',
  senior_player: 'Senior Player',
}

export default function WelcomePage() {
  const [skillLevel, setSkillLevel] = useState('')
  const router = useRouter()

  useEffect(() => {
    const level = localStorage.getItem('golf_skill_level')
    if (!level) { router.push('/onboarding'); return }
    setSkillLevel(level)
  }, [])

  if (!skillLevel) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-sm text-gray-500">Your AI guide to better golf</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="text-center max-w-md">
          <div className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            🎯 Your Plan is Ready
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Your MyGolf Plan
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-10">
            Your personalized golf experience is ready — videos, articles, and AI guidance all matched to your game as a <strong className="text-green-700">{TIER_LABELS[skillLevel]}</strong>.
          </p>
          <a href="/plan" className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-colors">
            Go to MyGolf Plan →
          </a>
          <p className="text-sm text-gray-400 mt-4">You can update your skill level anytime from the plan page</p>
        </div>
      </main>
    </div>
  )
}