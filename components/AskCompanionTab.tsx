'use client'

import { useState, useRef, useEffect } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  skillLevel?: string
  onBack?: () => void
}

const TIER_LABELS: Record<string, string> = {
  beginner: 'Getting Started',
  intermediate: 'Building Consistency',
  advanced: 'Sharpening Your Game',
  all: 'All Levels',
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "Sorry, I couldn't connect right now. Please try again in a moment." },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const tierLabel = TIER_LABELS[skillLevel] ?? 'All Levels'

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>

      {/* Context banner with back button */}
      <div className="flex items-center justify-between gap-2 mb-4 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800">
        <div className="flex items-center gap-2">
          <span className="text-base">🏌️</span>
          <span>
            Chatting as a <strong>{tierLabel}</strong> golfer ·{' '}
            <a href="/onboarding" className="underline hover:no-underline text-green-700">
              retake assessment
            </a>
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-green-600 hover:text-green-800 whitespace-nowrap"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="py-8">
            <p className="text-center text-gray-500 text-sm mb-6">
              Ask me anything about your golf game — from swing basics to course strategy.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <span className="mr-2 mt-1 text-base shrink-0">⛳</span>}
            {msg.role === 'assistant' && <p className="text-xs text-green-700 font-semibold mb-1">Answered by Your MyGolf Companion AI ⛳</p>}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-green-700 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <span className="mr-2 mt-1 text-base">⛳</span>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 pt-4">
        {messages.length > 0 && (
          <button
            onClick={() => onBack?.()}
            className="w-full mb-3 text-sm text-green-700 border border-green-200 rounded-xl py-2 hover:bg-green-50 transition-colors"
          >
            ← Back to Video Library
          </button>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your Golf AI Companion…"
            rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300 max-h-32 overflow-y-auto"
            style={{ minHeight: 44 }}
            disabled={loading}
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
