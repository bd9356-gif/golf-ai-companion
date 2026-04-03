'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

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

const SECTIONS = [
  {
    icon: '🏌️',
    title: 'MyBag',
    subtitle: 'Your Golf Bag',
    href: '/library',
    description: 'Your saved videos, guides, and AI answers — everything you carry with you.',
  },
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
    icon: '🎬',
    title: 'Browse All Videos',
    subtitle: 'Full Video Library',
    href: '/videos',
    description: 'Explore the full library of 767 instruction videos — browse by skill and topic.',
  },
  {
    icon: '🏌️',
    title: 'MyCourses',
    subtitle: 'Your Home Courses',
    href: '/courses',
    description: 'Save your favorite courses — notes, tips, and tee time links all in one place.',
  },
]

export default function ClubhousePage() {
  const [skillLevel, setSkillLevel] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      // If there's a hash token (OAuth implicit flow), let Supabase process it
      if (window.location.hash && window.location.hash.includes('access_token')) {
        await supabase.auth.getSession()
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      const level = localStorage.getItem('golf_skill_level')
      if (!level) { router.push('/onboarding'); return }
      setSkillLevel(level)
    }
    init()
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
            MyClubHouse
          </h2>
          <p className="text-gray-500 text-base mb-1">
            Your AI-powered starting point for everything in your game.
          </p>
          <div className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-full mt-1">
            <span className="text-base font-bold">⛳ {TIER_LABELS[skillLevel]}</span>
            <span className="text-green-200">·</span>
            <a href="/onboarding" className="text-green-200 hover:text-white underline text-sm font-medium">Change level</a>
          </div>
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
                    <span className="text-xs text-green-700 font-semibold">— {section.subtitle}</span>
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