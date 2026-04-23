'use client'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Single Clubhouse hero. Lives in /public/clubhouse-hero.png so it's served
// statically from the app's origin — no third-party CDN, no daily rotation.
const CLUBHOUSE_HERO = { url: '/clubhouse-hero.png', name: 'The Clubhouse' }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Unified tile design: a thin gray ring with a thick green left stripe.
// Every destination reads as "part of the same app" instead of a rainbow
// of per-section colors. Green is the brand color throughout.
const JOURNEY_SECTIONS = [
  {
    icon: '📺',
    title: 'Golf TV',
    href: '/golf-tv',
    description: 'Every lesson, one tap away.',
  },
  {
    icon: '🏌️',
    title: 'My Golf Bag',
    href: '/bag',
    description: 'Save, sort, and build your game.',
  },
  {
    icon: '🏠',
    title: 'My Courses',
    href: '/home-courses',
    description: 'Notes, tips, tee times.',
  },
]

const PROSHOP_SECTIONS = [
  {
    icon: '📖',
    title: 'Playbook',
    href: '/guides',
    description: 'Read smarter. Play better.',
  },
  {
    icon: '🎓',
    title: 'Club Pro',
    href: '/club-pro',
    description: 'Ask anything. Get clear answers.',
  },
]

// Shared tile styling — green left edge, subtle gray ring, green hover.
const TILE_CLASSES =
  'block p-4 rounded-2xl border-2 border-gray-200 border-l-8 border-l-green-600 hover:border-green-300 hover:shadow-sm transition-all bg-white'

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

  const hero = CLUBHOUSE_HERO
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
        {/* Clubhouse hero image — single static asset served from /public. */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-4 sm:mb-5 h-28 sm:h-40 md:h-52">
          <img src={hero.url} alt={hero.name} className="w-full h-full object-cover" />
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
        </div>

        {/* Your Golf Journey */}
        <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase px-1 mb-2.5">Your Golf Journey</h3>
        <div className="space-y-2.5">
          {JOURNEY_SECTIONS.map((section) => (
            <a key={section.title} href={section.href} className={TILE_CLASSES}>
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">{section.title}</h3>
                  <p className="text-sm mt-0.5 leading-snug text-gray-600 truncate">{section.description}</p>
                </div>
                <span className="text-gray-400 shrink-0 text-lg">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* The Pro Shop — AI-powered tools framed as staff you can consult. */}
        <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase px-1 mt-5 sm:mt-7 mb-2.5">The Pro Shop</h3>
        <div className="space-y-2.5">
          {PROSHOP_SECTIONS.map((section) => (
            <a key={section.title} href={section.href} className={TILE_CLASSES}>
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">{section.title}</h3>
                  <p className="text-sm mt-0.5 leading-snug text-gray-600 truncate">{section.description}</p>
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
