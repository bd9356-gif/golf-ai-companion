'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const QUESTIONS = [
  {
    id: 'experience',
    question: 'How long have you been playing golf?',
    options: [
      { label: 'Brand new — never played', value: 'new' },
      { label: 'Less than 2 years', value: 'casual' },
      { label: '2–5 years', value: 'some' },
      { label: '5+ years', value: 'experienced' },
    ],
  },
  {
    id: 'score',
    question: 'What do you typically score for 18 holes?',
    options: [
      { label: "I'm still learning the basics", value: 'learning' },
      { label: 'Over 100', value: 'over100' },
      { label: '85–100', value: '85to100' },
      { label: 'Under 85', value: 'under85' },
    ],
  },
  {
    id: 'problem',
    question: "What's your biggest challenge right now?",
    options: [
      { label: 'Driver & tee shots', value: 'driver' },
      { label: 'Iron play & ball striking', value: 'irons' },
      { label: 'Short game (chipping & pitching)', value: 'shortgame' },
      { label: 'Putting', value: 'putting' },
    ],
  },
  {
    id: 'goal',
    question: 'What do you most want to improve?',
    options: [
      { label: 'Consistency — fewer bad shots', value: 'consistency' },
      { label: 'Distance — hit it farther', value: 'distance' },
      { label: 'Course management & strategy', value: 'strategy' },
      { label: 'Lower my handicap', value: 'handicap' },
    ],
  },
]

function deriveSkillLevel(answers) {
  const { experience, score } = answers
  if (experience === 'new' || score === 'learning') return 'beginner'
  if (score === 'over100' || experience === 'casual') return 'beginner'
  if (score === '85to100' || experience === 'some') return 'intermediate'
  if (score === 'under85' || experience === 'experienced') return 'advanced'
  return 'beginner'
}

function deriveTopics(answers) {
  const topics = []
  const problemMap = {
    driver: 'driver',
    irons: 'iron',
    shortgame: 'chipping',
    putting: 'putting',
  }
  const goalMap = {
    consistency: 'consistency',
    distance: 'distance',
    strategy: 'course management',
    handicap: 'scoring',
  }
  if (answers.problem) topics.push(problemMap[answers.problem])
  if (answers.goal) topics.push(goalMap[answers.goal])
  return topics.filter(Boolean)
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const router = useRouter()

  const current = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const progress = ((step) / QUESTIONS.length) * 100

  function handleSelect(value) {
    setSelected(value)
  }

  function handleNext() {
    if (!selected) return
    const newAnswers = { ...answers, [current.id]: selected }
    setAnswers(newAnswers)
    setSelected(null)

    if (isLast) {
      const skillLevel = deriveSkillLevel(newAnswers)
      const topics = deriveTopics(newAnswers)
      localStorage.setItem('golf_skill_level', skillLevel)
      localStorage.setItem('golf_topics', JSON.stringify(topics))
      localStorage.setItem('golf_answers', JSON.stringify(newAnswers))
      router.push('/')
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">⛳ MyGolf Companion</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col">
        {/* Intro */}
        {step === 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get My Video Plan</h2>
            <p className="text-gray-500">
              Answer a few quick questions and I'll recommend the best videos for your game.
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
          <div
            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">Question {step + 1} of {QUESTIONS.length}</p>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{current.question}</h3>

          <div className="space-y-3">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-base font-medium ${
                  selected === opt.value
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Next button */}
        <div className="mt-8">
          <button
            onClick={handleNext}
            disabled={!selected}
            className="w-full py-4 bg-green-700 text-white rounded-xl text-base font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? 'Get My Video Plan →' : 'Next →'}
          </button>
        </div>
      </main>
    </div>
  )
}