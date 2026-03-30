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
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-sm text-gray-500">Your AI guide to better golf</p>
          </div>
          <a href="/plan" className="text-sm font-semibold text-green-700 border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50 transition-colors">
            MyGolf Plan →
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">

        <div className="text-center mb-10">
          <div className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            🎯 Your Plan is Ready
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome to Your MyGolf Plan
          </h2>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            You're set up as a <strong className="text-green-700">{TIER_LABELS[skillLevel]}</strong>. Here's everything that's now personalized for your game.
          </p>
        </div>

        <div className="max-w-lg mx-auto space-y-5 mb-10">
          <div className="border-l-4 border-green-700 pl-4">
            <p className="font-bold text-gray-900">MyGolf Plan</p>
            <p className="text-sm text-gray-500 mt-0.5">Your personalized training plan — videos, articles, and AI answers matched to your skill level.</p>
          </div>
          <div className="border-l-4 border-green-300 pl-4">
            <p className="font-bold text-gray-900">MyVideos</p>
            <p className="text-sm text-gray-500 mt-0.5">Videos tailored to your game and your level — content that actually helps you improve.</p>
          </div>
          <div className="border-l-4 border-green-300 pl-4">
            <p className="font-bold text-gray-900">MyArticles</p>
            <p className="text-sm text-gray-500 mt-0.5">AI-crafted golf insights matched to your level — simple guidance that makes your game clearer.</p>
          </div>
          <div className="border-l-4 border-green-300 pl-4">
            <p className="font-bold text-gray-900">Ask MyGolf AI</p>
            <p className="text-sm text-gray-500 mt-0.5">Personalized answers for your game — clear, level-matched guidance when you need it.</p>
          </div>
          <div className="border-l-4 border-green-300 pl-4">
            <p className="font-bold text-gray-900">MyLibrary</p>
            <p className="text-sm text-gray-500 mt-0.5">Your saved videos, articles, and AI answers — all organized around your skill level.</p>
          </div>
        </div>

        <div className="text-center">
          <a href="/plan" className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-colors">
            Go to MyGolf Plan →
          </a>
          <p className="text-sm text-gray-400 mt-3">You can update your skill level anytime from the plan page</p>
        </div>

      </main>
    </div>
  )
}