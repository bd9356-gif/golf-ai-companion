'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [videos, setVideos] = useState([])
  const [selectedTier, setSelectedTier] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('golf_skill_tier') || 'all'
    }
    return 'all'
  })
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [loading, setLoading] = useState(true)

  const tiers = ['all', 'beginner', 'intermediate', 'advanced']
  const topics = ['all', 'grip', 'stance', 'swing', 'putting', 'chipping', 'pitching', 'bunker', 'course management', 'mental game', 'fitness', 'rules', 'equipment']

  useEffect(() => { fetchVideos() }, [selectedTier, selectedTopic])

  async function fetchVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select(`id, title, url, thumbnail_url, channel_name, video_metadata (skill_tiers, topics, ai_summary, quality_score)`)
      .not('video_metadata', 'is', null)
      .limit(24)

    if (error) { console.error(error); setLoading(false); return }

    let filtered = data.filter(v => v.video_metadata?.length > 0)
    if (selectedTier !== 'all') filtered = filtered.filter(v => v.video_metadata[0]?.skill_tiers?.includes(selectedTier))
    if (selectedTopic !== 'all') filtered = filtered.filter(v => v.video_metadata[0]?.topics?.includes(selectedTopic))

    setVideos(filtered)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)', fontFamily: 'Georgia, serif', color: '#e8e0d0' }}>
      <header style={{ padding: '2rem 3rem', borderBottom: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#d4af37', margin: 0, letterSpacing: '0.05em' }}>⛳ My Golf AI Companion</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#8a9bb0', fontSize: '0.9rem' }}>Curated instruction matched to your game</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#d4af37' }}>{videos.length} videos</div>
          <a href="/onboarding" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#8a9bb0', textDecoration: 'none' }}>Retake Assessment</a>
        </div>
      </header>
      <div style={{ padding: '1.5rem 3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a9bb0' }}>Skill Level</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tiers.map(tier => (
              <button key={tier} onClick={() => setSelectedTier(tier)} style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: selectedTier === tier ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.15)', background: selectedTier === tier ? 'rgba(212,175,55,0.2)' : 'transparent', color: selectedTier === tier ? '#d4af37' : '#8a9bb0', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize' }}>{tier}</button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a9bb0' }}>Topic</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {topics.map(topic => (
              <button key={topic} onClick={() => setSelectedTopic(topic)} style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: selectedTopic === topic ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.15)', background: selectedTopic === topic ? 'rgba(212,175,55,0.2)' : 'transparent', color: selectedTopic === topic ? '#d4af37' : '#8a9bb0', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize' }}>{topic}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '2rem 3rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8a9bb0' }}>Loading videos...</div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8a9bb0' }}>No videos found for this filter combination.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {videos.map(video => (
              <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  {video.thumbnail_url && <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '170px', objectFit: 'cover' }} />}
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#e8e0d0', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</h3>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#8a9bb0' }}>{video.channel_name}</p>
                    {video.video_metadata?.[0]?.ai_summary && <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#a0b0c0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.video_metadata[0].ai_summary}</p>}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {video.video_metadata?.[0]?.skill_tiers?.map(tier => (
                        <span key={tier} style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.7rem', background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)', textTransform: 'capitalize' }}>{tier}</span>
                      ))}
                      {video.video_metadata?.[0]?.topics?.slice(0, 2).map(topic => (
                        <span key={topic} style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: '#8a9bb0', border: '1px solid rgba(255,255,255,0.1)', textTransform: 'capitalize' }}>{topic}</span>
                      ))}
                      {video.video_metadata?.[0]?.quality_score && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#d4af37' }}>⭐ {video.video_metadata[0].quality_score}</span>}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}