const TIER_LABELS = {
  beginner: 'Beginner',
  building_game: 'Building Your Game',
  building_consistency: 'Building Consistency',
  improving_player: 'Improving Player',
  advanced_player: 'Advanced Player',
  senior_player: 'Senior Player',
}

export default function SkillBanner({ skillLevel, context = 'videos', count = null }) {
  if (!skillLevel) return null

  const label = TIER_LABELS[skillLevel] || skillLevel

  const contextText = {
    videos: `Showing videos for a ${label}`,
    guides: `Showing guides for a ${label}`,
    pro: `Chatting as a ${label}`,
    bag: `MyBag · ${label}`,
  }[context] || `Playing as a ${label}`

  return (
    <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
      <span className="text-sm text-green-800">
        🎯 {contextText}
      </span>
      {count !== null && (
        <span className="text-xs text-green-600 font-medium">
          {count} saved for you
        </span>
      )}
    </div>
  )
}
