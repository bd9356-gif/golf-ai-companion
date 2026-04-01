'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const QUESTIONS = [
  {
    id: 'score',
    question: 'What do you typically shoot for 18 holes?',
    options: [
      { value: 'beginner', label: "I'm just starting out", sublabel: 'New to golf or fewer than 10 rounds' },
      { value: 'building_game', label: '110 or higher', sublabel: 'Learning the game, working on basics' },
      { value: 'building_consistency', label: '95–110', sublabel: 'Getting more consistent round to round' },
      { value: 'improving_player', label: '80–95', sublabel: 'Solid game, looking to break 80' },
      { value: 'advanced_player', label: 'Under 80', sublabel: 'Low handicap, working on scoring' },
      { value: 'senior_player', label: 'Senior golfer', sublabel: 'Focused on mobility, rhythm, and enjoyment' },
    ],
  },
  {
    id: 'struggle',
    question: "What's your biggest struggle right now?",
    options: [
      { value: 'driving', label: '🏌️ Driving & Tee Shots', sublabel: 'Accuracy, distance, or consistency off the tee' },
      { value: 'iron play', label: '⛳ Iron Play', sublabel: 'Ball striking, approach shots, contact' },
      { value: 'short game', label: '🎯 Short Game', sublabel: 'Chipping, pitching, and getting up and down' },
      { value: 'putting', label: '🕳️ Putting', sublabel: 'Distance control, reading greens, making putts' },
      { value: 'mental game', label: '🧠 Mental Game', sublabel: 'Focus, course management, staying consistent' },
      { value: 'fitness', label: '💪 Fitness & Flexibility', sublabel: 'Mobility, strength, and injury prevention' },
    ],
  },
  {
    id: 'goal',
    question: 'What is your main goal?',
    options: [
      { value: 'lower_scores', label: '📉 Lower My Scores', sublabel: 'Break a scoring barrier or reach a handicap goal' },
      { value: 'consistency', label: '🔄 More Consistency', sublabel: 'Stop the big numbers and play more even rounds' },
      { value: 'distance', label: '💥 More Distance', sublabel: 'Hit the ball further off the tee and with irons' },
      { value: 'enjoy', label: '😊 Enjoy the Game More', sublabel: 'Have more fun and feel better on the course' },
    ],
  },
  {
    id: 'frequency',
    question: 'How often do you play or practice?',
    options: [
      { value: 'rarely', label: 'Rarely', sublabel: 'A few times a year' },
      { value: 'monthly', label: 'Monthly', sublabel: 'Once or twice a month' },
      { value: 'weekly', label: 'Weekly', sublabel: 'Once or twice a week' },
      { value: 'frequent', label: 'Frequently', sublabel: '3+ times per week' },
    ],
  },
]

// Map answers to prioritized topic list
function buildTopics(answers) {
  const { score, struggle, goal } = answers

  // Start with struggle as the top priority
  const topics = [struggle]

  // Add topics based on score/tier
  const tierTopics = {
    beginner: ['swing', 'grip', 'stance', 'putting', 'chipping'],
    building_game: ['swing', 'driving', 'chipping', 'putting', 'course management'],
    building_consistency: ['iron play', 'driving', 'short game', 'putting', 'mental game'],
    improving_player: ['iron play', 'short game', 'bunker', 'course management', 'mental game'],
    advanced_player: ['driving', 'iron play', 'short game', 'bunker', 'course management'],
    senior_player: ['swing', 'fitness', 'course management', 'mental game', 'putting'],
  }

  // Add goal-based topics
  const goalTopics = {
    lower_scores: ['course management', 'mental game', 'short game'],
    consistency: ['swing', 'iron play', 'mental game'],
    distance: ['driving', 'swing', 'fitness'],
    enjoy: ['course management', 'mental game', 'putting'],
  }

  const extra = [...(tierTopics[score] ?? []), ...(goalTopics[goal] ?? [])]
  for (const t of extra) {
    if (!topics.includes(t)) topics.push(t)
  }

  return topics.slice(0, 6)
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const router = useRouter()

  const current = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  function handleSelect(value) {
    const updated = { ...answers, [current.id]: value }
    setAnswers(updated)

    if (isLast) {
      // Build personalized topic list from answers
      const topics = buildTopics(updated)
      const skillLevel = updated.score

      localStorage.setItem('golf_skill_level', skillLevel)
      localStorage.setItem('golf_topics', JSON.stringify(topics))
      localStorage.setItem('golf_answers', JSON.stringify(updated))

      router.push('/welcome')
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">⛳ MyGolf Companion</h1>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Question {step + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(((step) / QUESTIONS.length) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{current.question}</h2>
          <p className="text-gray-400 text-sm">
            {isLast ? "Last question — we'll build your plan right after." : "Tap to select and move to the next question."}
          </p>
        </div>

        <div className="space-y-3 flex-1">
          {current.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
            >
              <p className="font-semibold text-base text-gray-800">{opt.label}</p>
              <p className="text-sm mt-0.5 text-gray-500">{opt.sublabel}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}