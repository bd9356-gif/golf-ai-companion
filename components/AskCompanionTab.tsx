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
  onBack?: () => void
  onClearChat?: () => void
}

const SUGGESTED_QUESTIONS = [
  'How do I stop slicing the ball?',
  'What are the fundamentals of a good putting stroke?',
  'How should I practice chipping around the green?',
  'What causes fat shots and how do I fix them?',
  'How do I get more distance off the tee?',
  'What should I work on to break 90?',
]

export default function AskCompanionTab({ onBack }: Props) {
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
        body: JSON.stringify({ messages: newMessages }),
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

  async function ensureHoldingBucketId(userId: string): Promise<string | null> {
    const { data: existing } = await supabase
      .from('focus_leaves')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Holding Bucket')
      .maybeSingle()
    if ((existing as any)?.id) return (existing as any).id
    const { data: created } = await supabase
      .from('focus_leaves')
      .insert({ user_id: userId, name: 'Holding Bucket', position: 0 })
      .select('id')
      .single()
    return (created as any)?.id ?? null
  }

  async function saveAnswer(index: number) {
    if (!user) { window.location.href = '/login'; return }
    const question = messages[index - 1]?.content || 'Golf question'
    const answer = messages[index].content
    const { data: inserted, error } = await supabase
      .from('saved_answers')
      .insert({ user_id: user.id, question, answer, skill_level: 'all' })
      .select('id')
      .single()
    if (error) return
    const answerId = (inserted as any)?.id
    if (answerId) {
      const leafId = await ensureHoldingBucketId(user.id)
      if (leafId) {
        const { data: maxRow } = await supabase
          .from('leaf_items')
          .select('position')
          .eq('leaf_id', leafId)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle()
        const nextPos = ((maxRow as any)?.position ?? -1) + 1
        await supabase.from('leaf_items').upsert(
          { leaf_id: leafId, user_id: user.id, item_type: 'answer', item_id: String(answerId), position: nextPos },
          { onConflict: 'leaf_id,item_type,item_id', ignoreDuplicates: true }
        )
      }
    }
    setSavedIndexes(prev => new Set([...prev, index]))
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Clear chat — only visible once there's something to clear */}
      {hasMessages && (
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-500 hover:text-gray-800 font-medium"
          >
            Clear chat
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 pb-4">
        {!hasMessages && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">What do you want to work on?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pick a question below or ask your own — personal AI guidance, right from your Club Pro.
              </p>
            </div>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-xl text-sm text-gray-800 transition-all hover:shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2`}>
              {!isUser && <span className="text-base mt-2 shrink-0">⛳</span>}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-green-700 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border-2 border-emerald-500 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {!isUser && (
                  <button
                    onClick={() => saveAnswer(i)}
                    className={`mt-1.5 text-xs font-semibold transition-colors ${
                      savedIndexes.has(i)
                        ? 'text-green-700'
                        : 'text-gray-400 hover:text-green-700'
                    }`}
                  >
                    {savedIndexes.has(i) ? '🔖 Saved to MyBag' : '🔖 Save to MyBag'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start items-start gap-2">
            <span className="text-base mt-2 shrink-0">⛳</span>
            <div className="bg-white border-2 border-emerald-500 rounded-2xl rounded-bl-sm px-4 py-3">
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
        <div className="flex gap-2 items-end">
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
            placeholder="Ask your Club Pro…"
            rows={1}
            style={{ fontSize: '16px' }}
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 resize-none transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="h-12 w-12 shrink-0 bg-green-700 text-white rounded-xl flex items-center justify-center hover:bg-green-800 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          AI responses are general guidance, not professional instruction.
        </p>
      </div>
    </div>
  )
}
