'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  skillLevel?: string
  onBack?: () => void
}

const SUGGESTED_QUESTIONS = [
  'How do I stop slicing the ball?',
  'What are the fundamentals of a good putting stroke?',
  'How should I practice chipping around the green?',
  'What causes fat shots and how do I fix them?',
  'How do I get more distance off the tee?',
  'What should I work on to break 90?',
]

export default function AskCompanionTab({ skillLevel = 'all', onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const [user, setUser] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ask-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, skillLevel }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  async function saveAnswer(index: number) {
    if (!user) {
      window.location.href = '/login'
      return
    }
    // Find the question (message before this answer)
    const question = messages[index - 1]?.content || 'Golf question'
    const answer = messages[index].content

    const { error } = await supabase.from('saved_answers').insert({
      user_id: user.id,
      question,
      answer,
    })

    if (!error) {
      setSavedIndexes(prev => new Set([...prev, index]))
    }
  }

  const TIER_LABEL: Record<string, string> = {
    beginner: 'Beginner',
    building_game: 'Building Your Game',
    building_consistency: 'Building Consistency',
    improving_player: 'Improving Player',
    advanced_player: 'Advanced Player',
    senior_player: 'Senior Player',
    all: 'All Levels',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 px-3 py-2 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
        <span className="text-sm text-green-800">
          🏌️ Chatting as a <strong>{TIER_LABEL[skillLevel] || 'All Levels'}</strong> golfer
          {' · '}
          <button onClick={() => window.location.href = '/onboarding'} className="text-green-600 hover:text-green-800 underline text-xs">retake assessment</button>
        </span>
        <button onClick={() => setMessages([])} className="text-xs text-green-600 hover:text-green-800">Clear chat</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 text-center mb-3">Try asking one of these:</p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 rounded-xl text-sm text-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} flex-col`}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}>
              {msg.role === 'assistant' && <span className="mr-2 mt-1 text-base shrink-0">⛳</span>}
              <div>
                {msg.role === 'assistant' && (
                  <p className="text-xs text-green-700 font-semibold mb-1">Answered by Your MyGolf Companion AI ⛳</p>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-green-700 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => saveAnswer(i)}
                    className={`mt-1 text-xs font-semibold transition-colors ${savedIndexes.has(i) ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {savedIndexes.has(i) ? '🔖 Saved to Library' : '🔖 Save Answer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-start gap-2">
            <span className="text-base shrink-0">⛳</span>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Ask your Golf AI Companion…"
            rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="h-11 w-11 shrink-0 bg-green-700 text-white rounded-xl flex items-center justify-center hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI responses are general guidance, not professional instruction.
        </p>
      </div>
    </div>
  )
}
