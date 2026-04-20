'use client'
import AskCompanionTab from '../../components/AskCompanionTab'

export default function ClubProPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/clubhouse" className="text-gray-500 hover:text-gray-700" aria-label="Back to MyClubhouse">←</a>
            <div>
              <h1 className="text-xl font-bold text-gray-900">🎓 Ask the Club Pro</h1>
              <p className="text-xs text-gray-500">Personal AI guidance for your game</p>
            </div>
          </div>
          <a href="/bag" className="text-sm text-gray-500 hover:text-gray-700" aria-label="Your Golf Bag">🏌️ Bag</a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col" style={{minHeight: 'calc(100vh - 73px)'}}>
        <AskCompanionTab />
      </main>
    </div>
  )
}
