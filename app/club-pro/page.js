'use client'
import AskCompanionTab from '../../components/AskCompanionTab'

export default function ClubProPage() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden overscroll-none">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40 shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <a
            href="/clubhouse"
            className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0"
            aria-label="Back to MyClubhouse"
          >
            ← Clubhouse
          </a>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">🎓</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">Ask the Club Pro</h1>
              <p className="text-xs text-green-700 font-semibold leading-tight">Personal AI guidance</p>
            </div>
          </div>
          <a
            href="/bag"
            className="text-3xl shrink-0 hover:scale-110 transition-transform leading-none"
            aria-label="Your Golf Bag"
            title="Your Golf Bag"
          >
            🏌️
          </a>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-3xl mx-auto w-full px-4 pt-3 pb-4 flex flex-col">
        <AskCompanionTab />
      </main>
    </div>
  )
}
