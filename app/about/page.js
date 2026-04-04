'use client'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <a href="/" className="hover:opacity-80 transition-opacity inline-block">
            <h1 className="text-2xl font-bold text-gray-900">⛳ MyGolf Companion</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your AI guide to better golf</p>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <button onClick={() => window.location.href='/welcome'} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-10">← Back</button>

        <h2 className="text-4xl font-bold text-gray-900 mb-4">About MyGolf Companion</h2>
        <p className="text-xl text-gray-500 leading-relaxed mb-12">
          We built MyGolf Companion for golfers who want to improve without the guesswork — a personal clubhouse of curated videos, expert guides, and AI coaching matched to your game.
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

        {/* What's inside */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">What's inside MyClubHouse</h3>
          <div className="space-y-5">
            {[
              {
                icon: '🎬',
                title: 'MyVideos — The Course',
                desc: '767 hand-picked instructional videos scored and categorized by AI — matched to your skill level and what you\'re working on.'
              },
              {
                icon: '📖',
                title: 'MyGuides — The Buddies',
                desc: 'Expert articles covering swing tips, course management, the mental game, and fitness — all matched to your skill level and filterable by topic.'
              },
              {
                icon: '🎓',
                title: 'MyPro — Ask the Club Pro',
                desc: 'Your AI golf coach available 24/7. Ask anything about your swing, course strategy, practice drills, or scoring — and save the answers to your Bag.'
              },
              {
                icon: '🏌️',
                title: 'MyBag — Your Golf Bag',
                desc: 'Save videos, guides, and AI answers as you go. Everything you\'ve collected lives in your Bag, organized by your skill journey. Nothing ever gets lost.'
              },
              {
                icon: '🛺',
                title: 'My Plan — The Golf Cart',
                desc: 'Load items from your Bag into your cart for today\'s focus — like putting clubs in your trunk before a round. Your Bag stays full; your cart is just what you\'re working on right now.'
              },
              {
                icon: '🏌️',
                title: 'MyCourses — Your Home Courses',
                desc: 'Save your favorite courses with notes, tips, phone numbers, and tee time links — all in one place. Tap to call or book directly from the app.'
              },
              {
                icon: '⛳',
                title: '6 Dedicated Skill Levels',
                desc: 'From Beginner to Advanced, including a dedicated Senior Player track focused on mobility, rhythm, and joint-friendly mechanics. Your journey is tracked across all levels.'
              },
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

        {/* The metaphor */}
        <div className="mb-12 bg-green-50 border border-green-100 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-green-900 mb-3">⛳ The ClubHouse Metaphor</h3>
          <p className="text-sm text-green-800 leading-relaxed">
            We think of MyGolf Companion as your personal clubhouse. The home page is the drive up — a fresh course view every day. Once inside, MyVideos is the course, MyGuides are your buddies, MyPro is the club pro, and MyBag is everything you carry with you. Your Golf Cart is what you load up for today's round. It all feels like golf because it is golf.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-green-900 mb-2">Ready to play better golf?</h3>
          <p className="text-green-700 mb-6">Drive to your ClubHouse and get started — free.</p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-bold text-base hover:bg-green-800 transition-colors"
          >
            ⛳ Drive to MyClubHouse →
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 mt-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>⛳ MyGolf Companion — Your AI guide to better golf</p>
          <div className="flex gap-6">
            <a href="/plan" className="hover:text-gray-600">MyVideos</a>
            <a href="/learn" className="hover:text-gray-600">MyGuides</a>
            <a href="/library" className="hover:text-gray-600">MyBag</a>
            <a href="/about" className="hover:text-gray-600">About</a>
          </div>
        </div>
      </footer>
    </div>
  )
}