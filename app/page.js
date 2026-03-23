'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [videos, setVideos] = useState([])
  const [selectedTier, setSelectedTier] = useState('all')
  const [loading, setLoading] = useState(true)
  const [keywords, setKeywords] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const tiers = ['all', 'beginner', 'intermediate', 'advanced']

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTier = localStorage.getItem('golf_skill_tier') || 'all'
      setSelectedTier(savedTier)
    }
    fetchVideos('all', '')
  }, [])

  async function fetchVideos(tier, kw) {
    setLoading(true)
    try {
      if (kw && kw.trim()) {
        const searchQuery = kw.trim().split(' ').filter(w => w.length > 2).join(' | ')
        if (searchQuery) {
          const { data: metaData } = await supabase
            .from('video_metadata')
            .select('video_id')
            .textSearch('search_vector', searchQuery)
            .limit(50)

          if (metaData?.length > 0) {
            const videoIds = metaData.map(m => m.video_id)
            const { data, error } = await supabase
              .from('videos')
              .select('id, title, url, thumbnail_url, channel_name, video_metadata (skill_tiers, topics, ai_summary, quality_score)')
              .in('id', videoIds)
              .limit(24)

            if (!error) {
              let filtered = data.filter(v => v.video_metadata?.length > 0)
              if (tier !== 'all') filtered = filtered.filter(v => v.video_metadata[0]?.skill_tiers?.includes(tier))
              setVideos(filtered)
              setLoading(false)
              return
            }
          } else {
            setVideos([])
            setLoading(false)
            return
          }
        }
      }

      const { data, error } = await supabase
        .from('videos')
        .select('id, title, url, thumbnail_url, channel_name, video_metadata (skill_tiers, topics, ai_summary, quality_score)')
        .not('video_metadata', 'is', null)
        .limit(24)

      if (error) { console.error(error); setLoading(false); return }

      let filtered = data.filter(v => v.video_metadata?.length > 0)
      if (tier !== 'all') filtered = filtered.filter(v => v.video_metadata[0]?.skill_tiers?.includes(tier))
      setVideos(filtered)
    } catch (err) {
      console.error(err)
      setVideos([])
    }
    setLoading(false)
  }

  function handleTierChange(tier) {
    setSelectedTier(tier)
    fetchVideos(tier, keywords)
  }

  function handleSearch() {
    setKeywords(searchInput)
    fetchVideos(selectedTier, searchInput)
  }

  function clearSearch() {
    setKeywords('')
    setSearchInput('')
    fetchVideos(selectedTier, '')
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
              <button key={tier} onClick={() => handleTierChange(tier)} style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: selectedTier === tier ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.15)', background: selectedTier === tier ? 'rgba(212,175,55,0.2)' : 'transparent', color: selectedTier === tier ? '#d4af37' : '#8a9bb0', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize' }}>{tier}</button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a9bb0' }}>Search by problem or topic</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="e.g. slice, putting, bunker shot..." style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e8e0d0', fontSize: '0.85rem', outline: 'none', maxWidth: '400px' }} />
            <button onClick={handleSearch} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#d4af37', color: '#0a1628', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>Search</button>
            {keywords && <button onClick={clearSearch} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#8a9bb0', cursor: 'pointer', fontSize: '0.85rem' }}>Clear</button>}
          </div>
          {keywords && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#d4af37' }}>Showing results for: "{keywords}"</p>}
        </div>
      </div>
      <div style={{ padding: '2rem 3rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8a9bb0' }}>Loading videos...</div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8a9bb0' }}>
            <p>No videos found{keywords ? ` for "${keywords}"` : ''}.</p>
            {keywords && <button onClick={clearSearch} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#8a9bb0', cursor: 'pointer' }}>Show all videos</button>}
          </div>
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