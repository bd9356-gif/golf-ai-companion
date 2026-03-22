'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const router = useRouter()
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm your Golf AI Companion. I'll ask a few quick questions to match you with the right content. First — have you ever played a full 18 hole round of golf?" }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tier, setTier] = useState(null)
  const [keywords, setKeywords] = useState(null)

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updatedMessages }) })
    const data = await response.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    if (data.tier) { setTier(data.tier); localStorage.setItem('golf_skill_tier', data.tier) }
    if (data.keywords) { setKeywords(data.keywords); localStorage.setItem('golf_keywords', data.keywords) }
    setLoading(false)
  }

  function handleKeyDown(e) { if (e.key === 'Enter') sendMessage() }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)', fontFamily: 'Georgia, serif', color: '#e8e0d0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', margin: '0 0 0.5rem' }}>My Golf AI Companion</h1>
          <p style={{ color: '#8a9bb0', margin: 0 }}>Let's find the right content for your game</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', minHeight: '350px', maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)', border: msg.role === 'user' ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)', color: msg.role === 'user' ? '#d4af37' : '#e8e0d0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.75rem 1rem', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.06)', color: '#8a9bb0', fontSize: '0.9rem' }}>Thinking...</div>
            </div>
          )}
        </div>
        {tier && (
          <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem', color: '#8a9bb0', fontSize: '0.85rem' }}>Your skill level</p>
            <p style={{ margin: '0 0 0.25rem', color: '#d4af37', fontSize: '1.25rem', textTransform: 'capitalize', fontWeight: 'bold' }}>{tier}</p>
            {keywords && <p style={{ margin: '0 0 1rem', color: '#8a9bb0', fontSize: '0.85rem' }}>Finding videos for: {keywords}</p>}
            <button onClick={() => router.push('/')} style={{ background: '#d4af37', color: '#0a1628', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' }}>Show My Content</button>
          </div>
        )}
        {!tier && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your answer..." style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e8e0d0', fontSize: '0.9rem', outline: 'none' }} />
            <button onClick={sendMessage} disabled={loading} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#d4af37', color: '#0a1628', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>Send</button>
          </div>
        )}
      </div>
    </main>
  )
}