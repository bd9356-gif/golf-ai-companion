'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const TIERS = [
  {
    value: 'beginner',
    label: 'Beginner',
    sublabel: 'Just starting, learning the basics',
    topics: ['swing', 'grip', 'stance', 'putting', 'chipping'],
  },
  {
    value: 'building_game',
    label: 'Building Your Game',
    sublabel: 'Scoring 100+, working on consistency',
    topics: ['swing', 'driving', 'chipping', 'putting', 'course management'],
  },
  {
    value: 'building_consistency',
    label: 'Building Consistency',
    sublabel: 'Scoring 90–100, improving fundamentals',
    topics: ['iron play', 'driving', 'short game', 'putting', 'mental game'],
  },
  {
    value: 'improving_player',
    label: 'Improving Player',
    sublabel: 'Scoring 80–90, solid intermediate skills',
    topics: ['iron play', 'short game', 'bunker', 'course management', 'mental game'],
  },
  {
    value: 'advanced_player',
    label: 'Advanced Player',
    sublabel: 'Scoring 70–80, low-handicap and scoring well',
    topics: ['driving', 'iron play', 'short game', 'bunker', 'course management'],
  },
  {
    value: 'senior_player',
    label: 'Senior Player',
    sublabel: 'Prioritizing mobility, rhythm, balance, and joint-friendly mechanics',
    topics: ['swing', 'fitness', 'course management', 'mental game', 'putting'],
  },
]

export default function OnboardingPage() {
  const [selected, setSelected] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const level = params.get('level')
    if (level && TIERS.find(t => t.value === level)) {
      setSelected(level)
    }
  }, [])

  function handleSubmit() {
    if (!selected) return
    const tier = TIERS.find(t => t.value === selected)
    localStorage.setItem('golf_skill_level', tier.value)
    localStorage.setItem('golf_topics', JSON.stringify(tier.topics))
    localStorage.setItem('golf_answers', JSON.stringify({ level: tier.value }))
    router.push('/welcome')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">⛳ MyGolf Companion</h1>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Your Skill Level</h2>
          <p className="text-gray-500 text-base">
            Select your current skill level to unlock personalized videos, tips, and guidance — and explore all other levels whenever you want.
          </p>
        </div>

        <div className="space-y-3 flex-1">
          {TIERS.map((tier) => (
            <button
              key={tier.value}
              onClick={() => setSelected(tier.value)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                selected === tier.value
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <p className={`font-semibold text-base ${selected === tier.value ? 'text-green-800' : 'text-gray-800'}`}>
                {tier.label}
              </p>
              <p className={`text-sm mt-0.5 ${selected === tier.value ? 'text-green-600' : 'text-gray-500'}`}>
                {tier.sublabel}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="w-full py-4 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Go to MyGolfClubhouse →
          </button>
        </div>
      </main>
    </div>
  )
}