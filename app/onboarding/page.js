'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SKILL_KEYWORDS = {
  beginner: ['beginner', 'new to golf', 'just started', 'never played', 'getting started', 'novice'],
  intermediate: ['intermediate', 'building consistency', 'some experience', 'played a few years'],
  advanced: ['advanced', 'low handicap', 'scratch', 'tournament', 'sharpening'],
}

function detectSkillLevel(text) {
  const lower = text.toLowerCase()
  for (const [level, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return level
  }
  return null
}

export default function OnboardingPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const router = useRouter()
  const bottomRef = useRef(null)

  useEffect(() => {
    startConversation()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startConversation() {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      })
      const data = await res.json()
      setMessages([{ role: 'assistant', content: data.reply }])
    } catch {
      setMessages([
        {
          role: 'assistant',
          content:
            "Hi! I'm your Golf AI Companion. Let's find the right content for your game. Have you ever played a full 18-hole round of golf?",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function saveSkillLevel(level) {
    localStorage.setItem('golf_skill_level', level)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      const reply = data.reply

      setMessages([...newMessages, { role: 'assistant', content: reply }])

      if (data.skillLevel) {
        saveSkillLevel(data.skillLevel)
        setComplete(true)
      } else {
        const detected = detectSkillLevel(reply)
        if (
          detected &&
          (reply.toLowerCase().includes('recommend') ||
            reply.toLowerCase().includes('match') ||
            reply.toLowerCase().includes('video'))
        ) {
          saveSkillLevel(detected)
          setComplete(true)
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "Sorry, something went wrong. Let's try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') sendMessage()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">⛳ MyGolf Companion</h1>
          <p className="text-xs text-gray-500">Let's find the right content for your game</p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <span className="mr-2 mt-1 shrink-0">⛳</span>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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
              <span className="mr-2 mt-1">⛳</span>
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

        {complete ? (
          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-4">
              Your skill level has been saved. Ready to see your personalized videos?
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors"
            >
              View My Videos →
            </button>
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer…"
              disabled={loading}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="h-11 w-11 shrink-0 bg-green-700 text-white rounded-xl flex items-center justify-center hover:bg-green-800 disabled:opacity-40 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}