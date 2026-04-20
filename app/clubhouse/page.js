'use client'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const CLUBHOUSE_IMAGES = [
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
  return CLUBHOUSE_IMAGES[(dayOfYear + 3) % CLUBHOUSE_IMAGES.length]
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const JOURNEY_SECTIONS = [
  {
    icon: '📺',
    title: 'Golf TV',
    subtitle: 'Build your plan',
    href: '/golf-tv',
    description: 'Browse every instruction video — save any to your bag to build your own plan.',
  },
  {
    icon: '📖',
    title: 'Guides',
    subtitle: 'The Buddies',
    href: '/guides',
    description: 'AI-crafted golf articles matched to your game — talk it over with your buddies.',
  },
  {
    icon: '🏌️',
    title: 'Your Golf Bag',
    subtitle: 'MyBag',
    href: '/bag',
    description: 'Your saved videos, guides, and AI answers — organized into your leaves of focus.',
  },
  {
    icon: '🏌️',
    title: 'Your Home Courses',
    subtitle: 'MyCourses',
    href: '/home-courses',
    description: 'Save your favorite courses — notes, tips, and tee time links all in one place.',
  },
]

const PROSHOP_SECTIONS = [
  {
    icon: '🎓',
    title: 'Ask the Club Pro',
    subtitle: 'Personal AI guidance',
    href: '/club-pro',
    description: 'Personal AI guidance for your game — step inside and talk with your club pro.',
  },
]

export default function ClubhousePage() {
  useEffect(() => {
    async function init() {
      // If there's a hash token (OAuth implicit flow), let Supabase process it
      if (window.location.hash && window.location.hash.includes('access_token')) {
        await supabase.auth.getSession()
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
    init()
  }, [])

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
        {/* Daily rotating course image with text overlay */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-6" style={{height: '220px'}}>
          <img src={getDailyImage().url} alt={getDailyImage().name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45 rounded-2xl" />
          {/* Text overlaid on image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow">
              MyClubhouse
            </h2>
            <p className="text-green-200 text-sm">
              Your AI-powered starting point for everything in your game.
            </p>
          </div>
          {/* Course name watermark */}
          <div className="absolute bottom-2 right-3">
            <span className="text-white/50 text-xs">{getDailyImage().name}</span>
          </div>
        </div>

        {/* Your Golf Journey */}
        <div className="mb-4">
          <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase px-1">Your Golf Journey</h3>
        </div>
        <div className="space-y-3">
          {JOURNEY_SECTIONS.map((section) => (
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

        {/* AI ProShop */}
        <div className="mb-4 mt-8">
          <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase px-1">🤖 AI ProShop</h3>
        </div>
        <div className="space-y-3">
          {PROSHOP_SECTIONS.map((section) => (
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
