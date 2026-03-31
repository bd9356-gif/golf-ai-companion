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
    icon: '⛳',
    title: 'MyVideos',
    subtitle: 'The Course',
    href: '/plan',
    description: 'Videos matched to your skill level — head out to the course and start improving.',
  },
  {
    icon: '📖',
    title: 'MyGuides',
    subtitle: 'The Buddies',
    href: '/learn',
    description: 'AI-crafted golf articles matched to your game — talk it over with your buddies.',
  },
  {
    icon: '🎓',
    title: 'MyPro',
    subtitle: 'Ask the Club Pro',
    href: '/plan?tab=ask',
    description: 'Personal AI guidance for your game — step inside and talk with your club pro.',
  },
  {
    icon: '🏌️',
    title: 'MyBag',
    subtitle: 'Your Golf Bag',
    href: '/library',
    description: 'Your saved videos, guides, and AI answers — everything you carry with you.',
  },
]

export default function ClubhousePage() {
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
          <a href="/profile" className="text-sm text-gray-500 hover:text-gray-700">👤 Profile</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            MyGolfClubhouse
          </h2>
          <p className="text-gray-500 text-base mb-1">
            Your AI-powered starting point for everything in your game.
          </p>
          <p className="text-sm text-green-700 font-medium">
            Playing as: {TIER_LABELS[skillLevel]} · <a href="/onboarding" className="underline hover:text-green-900">Change level</a>
          </p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className="block p-5 rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-gray-900">{section.title}</h3>
                    <span className="text-xs text-gray-400 font-medium">— {section.subtitle}</span>
                  </div>
                  <p className="text-sm mt-0.5 leading-relaxed text-gray-500">{section.description}</p>
                </div>
                <span className="text-gray-400 shrink-0 mt-1">→</span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}