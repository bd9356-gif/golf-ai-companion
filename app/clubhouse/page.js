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

// Per-section accent. The left border stripe on each tile picks up this
// color so the Clubhouse reads as a color-coded map into the rest of the
// app. Colors mirror the feature pages: Golf TV = green, Guides = purple,
// MyBag = amber (matches The Starter), Home Courses = orange, Club Pro =
// emerald.
const JOURNEY_SECTIONS = [
  {
    icon: '📺',
    title: 'Golf TV',
    subtitle: 'Watch & learn',
    href: '/golf-tv',
    description: 'Every lesson, one tap away.',
    stripe: 'border-l-green-500',
    hoverBorder: 'hover:border-green-300',
  },
  {
    icon: '📖',
    title: 'Guides',
    subtitle: 'The Playbook',
    href: '/guides',
    description: 'Read smart. Play smarter.',
    stripe: 'border-l-purple-500',
    hoverBorder: 'hover:border-purple-300',
  },
  {
    icon: '🏌️',
    title: 'Your Golf Bag',
    subtitle: 'MyBag',
    href: '/bag',
    description: 'Your saves, sorted and ready.',
    stripe: 'border-l-yellow-500',
    hoverBorder: 'hover:border-yellow-300',
  },
  {
    icon: '🏠',
    title: 'Home Courses',
    subtitle: 'MyCourses',
    href: '/home-courses',
    description: 'Notes, tips, tee times.',
    stripe: 'border-l-orange-500',
    hoverBorder: 'hover:border-orange-300',
  },
]

const PROSHOP_SECTIONS = [
  {
    icon: '🎓',
    title: 'Ask the Club Pro',
    subtitle: 'Your AI coach',
    href: '/club-pro',
    description: 'Ask anything. Get clear answers.',
    stripe: 'border-l-emerald-500',
    hoverBorder: 'hover:border-emerald-300',
  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

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

  const daily = getDailyImage()
  const greeting = getGreeting()

  return (
    <div className="min-h-screen bg-white">
      {/* Compact header — matches the Golf TV / MyBag pattern so the top bar
          is the same height everywhere in the app. */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-2xl shrink-0" aria-hidden="true">⛳</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">MyGolf Companion</h1>
            <p className="text-xs text-green-700 font-semibold leading-tight">Your AI guide to better golf</p>
          </div>
          <a
            href="/profile"
            className="text-2xl shrink-0 hover:scale-110 transition-transform leading-none"
            aria-label="Profile"
            title="Profile"
          >
            👤
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
        {/* Daily rotating course image — a little taller now that there's
            room (h-28 mobile → h-40 sm → h-52 md). */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-4 sm:mb-5 h-28 sm:h-40 md:h-52">
          <img src={daily.url} alt={daily.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45 rounded-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-green-100 text-[11px] sm:text-sm font-semibold tracking-wide uppercase leading-tight">{greeting}, golfer</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow leading-tight mt-0.5">
              MyClubhouse
            </h2>
            <p className="hidden sm:block text-green-200 text-xs sm:text-sm mt-1">
              Your home club — where your golf journey begins.
            </p>
          </div>
          <div className="absolute bottom-1 right-2 sm:bottom-2 sm:right-3">
            <span className="text-white/50 text-[10px] sm:text-xs">{daily.name}</span>
          </div>
        </div>

        {/* Your Golf Journey */}
        <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase px-1 mb-2.5">Your Golf Journey</h3>
        <div className="space-y-2.5">
          {JOURNEY_SECTIONS.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className={`block p-4 rounded-2xl border-2 border-gray-200 border-l-8 ${section.stripe} ${section.hoverBorder} hover:shadow-sm transition-all bg-white`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">{section.title}</h3>
                    <span className="text-xs text-green-700 font-semibold">— {section.subtitle}</span>
                  </div>
                  <p className="text-sm mt-1 leading-snug text-gray-600 truncate">{section.description}</p>
                </div>
                <span className="text-gray-400 shrink-0 text-lg">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* AI ProShop */}
        <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase px-1 mt-5 sm:mt-7 mb-2.5">🤖 AI ProShop</h3>
        <div className="space-y-2.5">
          {PROSHOP_SECTIONS.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className={`block p-4 rounded-2xl border-2 border-gray-200 border-l-8 ${section.stripe} ${section.hoverBorder} hover:shadow-sm transition-all bg-white`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">{section.title}</h3>
                    <span className="text-xs text-green-700 font-semibold">— {section.subtitle}</span>
                  </div>
                  <p className="text-sm mt-1 leading-snug text-gray-600 truncate">{section.description}</p>
                </div>
                <span className="text-gray-400 shrink-0 text-lg">→</span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
