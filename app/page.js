'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/* ─────────────────────────────────────────────────────────────
   TESTER BANNER — edit message/link here, redeploy.
   Bump BANNER.version to force-redisplay to users who dismissed.
   Set BANNER.enabled to false to hide entirely.
   ─────────────────────────────────────────────────────────── */
const BANNER = {
  enabled: false,
  version: 'v1',
  message: "Welcome, testers — here's what's new and what to try.",
  linkHref: '/notes',
  linkLabel: 'Tester notes →',
}

const FEATURES = [
  {
    emoji: '📺',
    title: 'Golf TV',
    blurb: 'Instructional videos, filtered and ready when you are.',
    href: '/golf-tv',
  },
  {
    emoji: '📖',
    title: 'Guides',
    blurb: 'AI-crafted articles to read smart and play smarter.',
    href: '/guides',
  },
  {
    emoji: '🏌️',
    title: 'Your Golf Bag',
    blurb: 'Your saves, sorted into five skill buckets.',
    href: '/bag',
  },
  {
    emoji: '🏠',
    title: 'Home Courses',
    blurb: 'Notes, phone numbers, and tee-time links for your favorite courses.',
    href: '/home-courses',
  },
  {
    emoji: '🎓',
    title: 'Ask the Club Pro',
    blurb: "An AI coach who's always ready with a clear answer.",
    href: '/club-pro',
  },
]

// Single landing hero image. Lives in /public/landing-hero.png so it's served
// statically from the app's origin — no third-party CDN, no daily rotation.
const LANDING_HERO = { url: '/landing-hero.png', name: 'MyGolf Companion' }

function firstNameFromUser(user) {
  if (!user) return null
  const full = user.user_metadata?.full_name || user.user_metadata?.name
  if (full) return String(full).split(' ')[0]
  if (user.email) return user.email.split('@')[0]
  return null
}

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      supabase.auth.getSession()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })

    if (BANNER.enabled && typeof window !== 'undefined') {
      const flagKey = `golf_ai_banner_dismissed_${BANNER.version}`
      if (!localStorage.getItem(flagKey)) {
        // Reading persisted dismissal from localStorage must happen after
        // mount (SSR has no window), so setState-in-effect is intentional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBannerVisible(true)
      }
    }
  }, [])

  function dismissBanner() {
    setBannerVisible(false)
    try {
      localStorage.setItem(`golf_ai_banner_dismissed_${BANNER.version}`, '1')
    } catch {}
  }

  const userName = firstNameFromUser(user)
  const image = LANDING_HERO

  return (
    <div className="min-h-screen bg-green-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-green-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <span className="text-gray-900 text-lg font-bold tracking-tight">MyGolf Companion</span>
          </div>
          {user ? (
            <a href="/clubhouse" className="text-green-800 text-sm font-semibold border-2 border-green-700 bg-white rounded-full px-3 py-1 hover:bg-green-50 transition-colors">
              MyClubhouse →
            </a>
          ) : (
            <a href="/login" className="text-green-800 text-sm font-semibold border-2 border-green-700 rounded-full px-3 py-1 hover:bg-green-100 transition-colors">
              Sign in
            </a>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pt-2 pb-6 flex flex-col">

        {/* Tester banner (dismissible) */}
        {BANNER.enabled && bannerVisible && (
          <div className="mb-3 bg-green-800 text-white rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
            <span className="text-sm leading-snug flex-1 min-w-0">
              {BANNER.message}{' '}
              <a
                href={BANNER.linkHref}
                className="underline font-semibold whitespace-nowrap"
              >
                {BANNER.linkLabel}
              </a>
            </span>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="text-green-200 hover:text-white text-lg leading-none px-1 shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* Entry box: hero image + CTA wrapped as one unit */}
        <div className="bg-white border border-green-100 rounded-3xl overflow-hidden shadow-sm mb-5">
          <div className="w-full relative" style={{ height: '150px' }}>
            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/0" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
              {userName ? (
                <>
                  <h1 className="text-xl font-bold text-white drop-shadow leading-tight">
                    Welcome back, {userName}.
                  </h1>
                  <p className="text-green-100 text-xs drop-shadow mt-0.5">
                    Your clubhouse is right where you left it.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-white drop-shadow leading-tight">
                    Play smarter golf.
                  </h1>
                  <p className="text-green-100 text-xs drop-shadow mt-0.5">
                    Lessons, guides, and an AI coach — all in one clubhouse.
                  </p>
                </>
              )}
            </div>
          </div>
          <a
            href={user ? '/clubhouse' : '/login'}
            className="block w-full py-2.5 bg-green-600 text-white text-center text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            {user ? 'Enter your clubhouse →' : 'Get started →'}
          </a>
        </div>

        {/* Feature tiles */}
        <section>
          <p className="text-[11px] text-green-800 uppercase tracking-[0.15em] font-semibold text-center mb-2.5">
            What's inside
          </p>
          <div className="grid gap-2">
            {FEATURES.map(({ emoji, title, blurb, href }) => (
              <a
                key={title}
                href={user ? href : '/login'}
                className="group bg-white border border-green-100 rounded-xl px-3.5 py-2.5 flex items-center gap-3 hover:border-green-300 hover:shadow-sm transition-all"
              >
                <span className="text-lg leading-none shrink-0">{emoji}</span>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-gray-900 font-semibold text-sm leading-tight">{title}</p>
                  <p className="text-gray-600 text-xs leading-snug mt-0.5">{blurb}</p>
                </div>
                <span className="text-green-700 text-sm shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-5 text-center">
          <a href="/about" className="text-[11px] text-green-800 hover:text-green-900 transition-colors">
            About MyGolf Companion
          </a>
        </footer>

      </main>
    </div>
  )
}
