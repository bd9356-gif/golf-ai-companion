'use client'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-xs text-gray-500">Your AI guide to better golf</p>
          </a>
          <div className="flex items-center gap-2">
            <a href="/videos" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Videos</a>
            <a href="/learn" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Learn</a>
            <a href="/onboarding" className="text-sm font-semibold text-white bg-green-700 rounded-xl px-4 py-2 hover:bg-green-800 transition-colors">
              Get My Plan
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">

        {/* Back link */}
        <a href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-10">
          ← Back to home
        </a>

        {/* Hero */}
        <h2 className="text-4xl font-bold text-gray-900 mb-4">About MyGolf Companion</h2>
        <p className="text-xl text-gray-500 leading-relaxed mb-12">
          We built MyGolf Companion because most golfers want to improve but don't know where to start — and the internet is full of conflicting advice.
        </p>

        {/* Mission */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            MyGolf Companion exists to give every golfer — regardless of skill level or budget — access to the same quality of instruction that tour players get. Not generic tips. Not one-size-fits-all advice. Personalized guidance matched to where your game actually is right now.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            We use AI to cut through the noise and surface the content that's actually relevant to your game. Whether you're just picking up a club for the first time or trying to break 80, we help you find the right videos and articles to move forward.
          </p>
        </div>

        {/* What we offer */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">What MyGolf Companion offers</h3>
          <div className="space-y-5">
            {[
              { icon: '🎬', title: '767 curated instructional videos', desc: 'Hand-picked from the best golf coaches on YouTube — scored and categorized by AI for quality and relevance.' },
              { icon: '🎯', title: 'Personalized video plans', desc: 'Tell us your skill level and we build a focused video plan matched to your game. No more scrolling through hundreds of videos hoping to find the right one.' },
              { icon: '📖', title: 'Expert articles', desc: 'Practical golf articles written with AI covering swing tips, course management, the mental game, and fitness — all matched to your skill level.' },
              { icon: '🤖', title: 'Ask MyGolf AI', desc: 'An AI golf coach available 24/7 to answer your questions about your swing, course strategy, practice drills, or anything else golf-related.' },
              { icon: '⛳', title: '6 dedicated skill levels', desc: 'Including a dedicated Senior Player track focused on mobility, rhythm, and joint-friendly mechanics.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Who it's for</h3>
          <p className="text-base text-gray-600 leading-relaxed mb-4">
            MyGolf Companion is built for recreational golfers who want to improve without spending thousands on lessons — and for seniors who want to keep playing the game they love without strain or injury.
          </p>
          <p className="text-base text-gray-600 leading-relaxed">
            We're not trying to replace a real instructor. We're the resource you use between lessons, at the driving range, or when you're watching golf on a Sunday afternoon and wondering why your swing doesn't look like that.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-green-900 mb-2">Ready to play better golf?</h3>
          <p className="text-green-700 mb-6">Get your personalized video plan in 30 seconds — free.</p>
          <a
            href="/onboarding"
            className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-base hover:bg-green-800 transition-colors"
          >
            Get My Video Plan →
          </a>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-8">
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