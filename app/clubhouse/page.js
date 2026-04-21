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
    subtitle: 'Build your plan',
    href: '/golf-tv',
    description: 'Your central hub for golf instruction — explore every lesson and shape your journey.',
    stripe: 'border-l-green-500',
    hoverBorder: 'hover:border-green-300',
  },
  {
    icon: '📖',
    title: 'Guides',
    subtitle: 'The Playbook',
    href: '/guides',
    description: 'AI-crafted golf articles that help you understand, improve, and play smarter.',
    stripe: 'border-l-purple-500',
    hoverBorder: 'hover:border-purple-300',
  },
  {
    icon: '🏌️',
    title: 'Your Golf Bag',
    subtitle: 'MyBag',
    href: '/bag',
    description: 'Sort your saves into skills and add key items to your golf cart for your plan.',
    stripe: 'border-l-yellow-500',
    hoverBorder: 'hover:border-yellow-300',
  },
  {
    icon: '🏠',
    title: 'Your Home Courses',
    subtitle: 'MyCourses',
    href: '/home-courses',
    description: 'Save your favorite courses — notes, tips, and tee time links all in one place.',
    stripe: 'border-l-orange-500',
    hoverBorder: 'hover:border-orange-300',
  },
]

const PROSHOP_SECTIONS = [
  {
    icon: '🎓',
    title: 'Ask the Club Pro',
    subtitle: 'Personal AI guidance',
    href: '/club-pro',
    description: 'Personal AI guidance for your game — step inside and talk with your club pro.',
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

      <main className="max-w-4xl mx-auto px-4 py-3 sm:py-5">
        {/* Daily rotating course image — compact on phone (h-24 = 96px) so
            the five tiles below fit a single iPhone viewport. Grows on
            wider screens where vertical space isn't the bottleneck. */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-3 sm:mb-5 h-24 sm:h-40 md:h-52">
          <img src={daily.url} alt={daily.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45 rounded-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-green-100 text-[10px] sm:text-sm font-semibold tracking-wide uppercase leading-tight">{greeting}, golfer</p>
            <h2 className="text-xl sm:text-3xl font-bold text-white drop-shadow leading-tight">
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
        <h3 className="text-[10px] sm:text-xs font-bold tracking-wider text-gray-500 uppercase px-1 mb-2">Your Golf Journey</h3>
        <div className="space-y-2">
          {JOURNEY_SECTIONS.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className={`block p-3 sm:p-4 rounded-2xl border border-gray-200 border-l-8 ${section.stripe} ${section.hoverBorder} hover:shadow-sm transition-all bg-white`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900">{section.title}</h3>
                    <span className="text-[11px] sm:text-xs text-green-700 font-semibold">— {section.subtitle}</span>
                  </div>
                  <p className="hidden sm:block text-sm mt-0.5 leading-relaxed text-gray-500">{section.description}</p>
                </div>
                <span className="text-gray-400 shrink-0">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* AI ProShop */}
        <h3 className="text-[10px] sm:text-xs font-bold tracking-wider text-gray-500 uppercase px-1 mt-4 sm:mt-7 mb-2">🤖 AI ProShop</h3>
        <div className="space-y-2">
          {PROSHOP_SECTIONS.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className={`block p-3 sm:p-4 rounded-2xl border border-gray-200 border-l-8 ${section.stripe} ${section.hoverBorder} hover:shadow-sm transition-all bg-white`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900">{section.title}</h3>
                    <span className="text-[11px] sm:text-xs text-green-700 font-semibold">— {section.subtitle}</span>
                  </div>
                  <p className="hidden sm:block text-sm mt-0.5 leading-relaxed text-gray-500">{section.description}</p>
                </div>
                <span className="text-gray-400 shrink-0">→</span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
