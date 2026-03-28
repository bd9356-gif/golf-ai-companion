'use client'

import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [hasPlan, setHasPlan] = useState(false)

  useEffect(() => {
    const level = localStorage.getItem('golf_skill_level')
    if (level) setHasPlan(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-xs text-gray-500">Your AI guide to better golf</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/videos" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Videos</a>
            <a href="/learn" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Learn</a>
            <a href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">About</a>
            {hasPlan ? (
              <a href="/plan" className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors">
                My Plan
              </a>
            ) : (
              <a href="/onboarding" className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors">
                Get My Plan
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
          AI-Powered Golf Instruction
        </div>
        <h2 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Play Better Golf.<br />
          <span className="text-green-700">Starting Today.</span>
        </h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          767 curated instruction videos and expert articles — matched to your skill level by AI. From beginner basics to advanced shot shaping.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="/onboarding"
            className="px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-colors"
          >
            Get My Video Plan →
          </a>
          <a
            href="/videos"
            className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors"
          >
            Browse Videos
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
          {[
            { stat: '767', label: 'Instruction Videos' },
            { stat: '6', label: 'Skill Levels' },
            { stat: '18+', label: 'Expert Articles' },
            { stat: 'AI', label: 'Personalized Plans' },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-green-700">{stat}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Everything you need to improve</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: '🎬', title: 'Curated Video Library', desc: '767 hand-picked instructional videos from top coaches. Search by problem, filter by skill level, play right in the app.' },
              { icon: '🎯', title: 'Personalized Video Plan', desc: 'Answer 1 question about your game and get a personalized plan of videos matched to your exact skill level.' },
              { icon: '📖', title: 'Expert Articles', desc: 'AI-written articles covering swing tips, course management, mental game, and fitness — personalized to your plan.' },
              { icon: '🤖', title: 'Ask MyGolf AI', desc: 'Got a question about your swing or strategy? Ask your personal AI golf coach anything, anytime.' },
              { icon: '⛳', title: '6 Skill Levels', desc: 'From complete beginners to low handicappers — including a dedicated Senior Player track.' },
              { icon: '📱', title: 'Mobile Friendly', desc: 'Built for the range and the course. Watch videos and read articles right from your phone.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <p className="text-3xl mb-3">{icon}</p>
                <h4 className="font-bold text-gray-900 text-base mb-2">{title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skill levels */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">Built for every golfer</h3>
        <p className="text-gray-500 text-center mb-10">Pick your level and get a plan tailored to where you are right now</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { level: 'Beginner', sub: 'Just starting out', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { level: 'Building Your Game', sub: 'Scoring 100+', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
            { level: 'Building Consistency', sub: 'Scoring 90–100', color: 'bg-orange-50 text-orange-700 border-orange-100' },
            { level: 'Improving Player', sub: 'Scoring 80–90', color: 'bg-purple-50 text-purple-700 border-purple-100' },
            { level: 'Advanced Player', sub: 'Scoring 70–80', color: 'bg-red-50 text-red-700 border-red-100' },
            { level: 'Senior Player', sub: 'Mobility & rhythm focus', color: 'bg-green-50 text-green-700 border-green-100' },
          ].map(({ level, sub, color }) => (
            <a key={level} href="/onboarding" className={`border rounded-xl p-4 hover:shadow-sm transition-all ${color}`}>
              <p className="font-bold text-sm">{level}</p>
              <p className="text-xs mt-0.5 opacity-75">{sub}</p>
            </a>
          ))}
        </div>
        <div className="text-center mt-8">
          <a href="/onboarding" className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-base hover:bg-green-800 transition-colors">
            Get My Video Plan →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>⛳ MyGolf Companion — Your AI guide to better golf</p>
          <div className="flex gap-6">
            <a href="/videos" className="hover:text-gray-600">Videos</a>
            <a href="/learn" className="hover:text-gray-600">Learn</a>
            <a href="/plan" className="hover:text-gray-600">My Plan</a>
            <a href="/about" className="hover:text-gray-600">About</a>
          </div>
        </div>
      </footer>
    </div>
  )
}