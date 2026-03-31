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

const SECTIONS = [
  {
    icon: '🎯',
    title: 'MyGolf Plan',
    description: 'Your personalized training plan — videos, articles, and AI answers matched to your skill level.',
    primary: true,
  },
  {
    icon: '🎬',
    title: 'MyVideos',
    description: 'Videos tailored to your game and your level — content that actually helps you improve.',
  },
  {
    icon: '📖',
    title: 'MyArticles',
    description: 'AI-crafted golf insights matched to your level — simple guidance that makes your game clearer.',
  },
  {
    icon: '🤖',
    title: 'Ask MyGolf AI',
    description: 'Personalized answers for your game — clear, level-matched guidance when you need it.',
  },
  {
    icon: '📚',
    title: 'MyLibrary',
    description: 'Your saved videos, articles, and AI answers — all organized around your skill level.',
  },
]

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
          <p className="text-sm text-gray-500">Your AI guide to better golf</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your MyGolf Plan
          </h2>
          <p className="text-gray-500 text-base">
            You're set up as a <strong className="text-green-700">{TIER_LABELS[skillLevel]}</strong> — here's everything personalized for your game.
          </p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className={`p-5 rounded-2xl border ${
                section.primary
                  ? 'bg-green-700 border-green-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h3 className={`font-bold text-base ${section.primary ? 'text-white' : 'text-gray-900'}`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm mt-0.5 leading-relaxed ${section.primary ? 'text-green-100' : 'text-gray-500'}`}>
                    {section.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a href="/plan" className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-colors">
            Go to MyGolf Plan →
          </a>
        </div>
      </main>
    </div>
  )
}