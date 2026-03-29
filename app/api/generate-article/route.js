import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Topic → shot types mapping
const TOPIC_SHOT_TYPES = {
  'swing':             ['full swing', 'drive', 'iron shot', 'fairway wood'],
  'putting':           ['putt', 'lag putt', 'short putt', 'breaking putt'],
  'short game':        ['chip', 'pitch', 'bunker shot', 'flop shot'],
  'course management': ['tee shot', 'approach shot', 'lay up'],
  'mental game':       ['pre-shot routine', 'focus', 'confidence'],
  'fitness':           ['flexibility', 'strength', 'mobility', 'warm up'],
}

// Topic → category mapping
const TOPIC_CATEGORY = {
  'swing':             'instruction',
  'putting':           'instruction',
  'short game':        'instruction',
  'course management': 'strategy',
  'mental game':       'strategy',
  'fitness':           'fitness',
}

const ARTICLE_PLAN = [
  // === SWING ===
  { topic: 'swing', tiers: ['beginner', 'building_game'], title: '5 Simple Swing Tips Every New Golfer Needs to Know' },
  { topic: 'swing', tiers: ['building_consistency', 'improving_player'], title: 'How to Stop Coming Over the Top and Finally Hit a Draw' },
  { topic: 'swing', tiers: ['improving_player', 'advanced_player'], title: 'The Impact Position Secret That Separates Good Golfers from Great Ones' },
  { topic: 'swing', tiers: ['senior_player'], title: 'The Effortless Swing: How Senior Golfers Can Generate Power Without Strain' },
  { topic: 'swing', tiers: ['beginner', 'building_game', 'building_consistency'], title: 'Why Your Grip is Costing You Distance (And How to Fix It)' },

  // === COURSE MANAGEMENT ===
  { topic: 'course management', tiers: ['building_game', 'building_consistency'], title: 'Stop Losing Strokes to Bad Decisions: A Beginner\'s Guide to Course Management' },
  { topic: 'course management', tiers: ['improving_player', 'advanced_player'], title: 'How to Think Like a Tour Pro: Shot Selection Strategy for Breaking 80' },
  { topic: 'course management', tiers: ['senior_player', 'improving_player'], title: 'Playing Smart Golf: How to Score Better Without Hitting It Farther' },
  { topic: 'course management', tiers: ['building_consistency', 'improving_player'], title: 'The One Rule That Will Save You 5 Strokes Every Round' },

  // === MENTAL GAME ===
  { topic: 'mental game', tiers: ['beginner', 'building_game'], title: 'How to Stay Calm on the Course When Everything Goes Wrong' },
  { topic: 'mental game', tiers: ['building_consistency', 'improving_player'], title: 'The Pre-Shot Routine That Eliminates Tension and Boosts Consistency' },
  { topic: 'mental game', tiers: ['improving_player', 'advanced_player'], title: 'How Tour Pros Handle Pressure: Mental Strategies for Competitive Golf' },
  { topic: 'mental game', tiers: ['senior_player'], title: 'Golf After 60: Why Your Mental Game Matters More Than Your Physical Game' },

  // === FITNESS ===
  { topic: 'fitness', tiers: ['beginner', 'building_game'], title: '10-Minute Golf Warmup Routine That Will Transform Your First Tee Shot' },
  { topic: 'fitness', tiers: ['building_consistency', 'improving_player'], title: 'The 3 Exercises That Will Add 20 Yards to Your Driver' },
  { topic: 'fitness', tiers: ['senior_player'], title: 'Golf Fitness for Seniors: 5 Gentle Exercises to Improve Your Swing at Any Age' },
  { topic: 'fitness', tiers: ['improving_player', 'advanced_player'], title: 'Hip Mobility Drills Every Golfer Should Do Daily' },
  { topic: 'fitness', tiers: ['senior_player', 'building_game'], title: 'How to Play 18 Holes Pain-Free: Joint-Friendly Golf Tips' },

  // === PUTTING ===
  { topic: 'putting', tiers: ['beginner', 'building_game'], title: 'The 3 Putting Fundamentals Every Beginner Must Master' },
  { topic: 'putting', tiers: ['building_consistency', 'improving_player'], title: 'How to Read Greens Like a Tour Pro' },
  { topic: 'putting', tiers: ['improving_player', 'advanced_player'], title: 'The Distance Control Secret That Will Eliminate 3-Putts Forever' },
  { topic: 'putting', tiers: ['senior_player'], title: 'Putting for Seniors: How to Hole More Putts with Less Physical Strain' },
  { topic: 'putting', tiers: ['building_game', 'building_consistency'], title: 'Why You Miss Short Putts (And the Simple Fix That Works)' },

  // === SHORT GAME ===
  { topic: 'short game', tiers: ['beginner', 'building_game'], title: 'The Chip Shot Made Simple: A Beginner\'s Guide to Getting Up and Down' },
  { topic: 'short game', tiers: ['building_consistency', 'improving_player'], title: 'How to Stop Chunking and Blading Chips Around the Green' },
  { topic: 'short game', tiers: ['improving_player', 'advanced_player'], title: 'Mastering Trajectory Control: High, Low, and Running Chip Shots' },
  { topic: 'short game', tiers: ['senior_player', 'building_game'], title: 'The Bump and Run: The Most Underrated Shot in Golf' },
  { topic: 'short game', tiers: ['advanced_player'], title: 'The Tour-Level Wedge Techniques That Spin the Ball Back' },

  // === MORE SWING ===
  { topic: 'swing', tiers: ['building_consistency', 'improving_player'], title: 'How to Finally Stop Slicing Your Driver (For Good)' },
  { topic: 'swing', tiers: ['advanced_player'], title: 'How to Shape Shots: Learning the Fade and Draw on Demand' },
  { topic: 'swing', tiers: ['building_game', 'building_consistency'], title: 'The Takeaway: Why the First 12 Inches of Your Swing Matters Most' },
  { topic: 'swing', tiers: ['senior_player', 'building_consistency'], title: 'The Slow Swing Secret: How Less Club Speed Creates More Consistency' },

  // === MORE COURSE MANAGEMENT ===
  { topic: 'course management', tiers: ['beginner', 'building_game'], title: 'Golf Etiquette 101: What Every New Golfer Needs to Know' },
  { topic: 'course management', tiers: ['advanced_player'], title: 'How to Build a Game Plan for Every Course You Play' },
  { topic: 'course management', tiers: ['building_game', 'building_consistency'], title: 'When to Lay Up and When to Go For It: A Simple Framework' },

  // === MORE MENTAL GAME ===
  { topic: 'mental game', tiers: ['building_game', 'building_consistency'], title: 'How to Bounce Back After a Bad Hole Without Losing Your Round' },
  { topic: 'mental game', tiers: ['senior_player', 'improving_player'], title: 'Golf Mindset for Mature Players: Playing with Patience and Purpose' },
  { topic: 'mental game', tiers: ['advanced_player'], title: 'How to Get Into the Zone: Peak Performance Strategies for Competitive Golf' },

  // === MORE FITNESS ===
  { topic: 'fitness', tiers: ['building_consistency', 'improving_player'], title: 'Core Strength for Golf: The 5 Exercises That Actually Help Your Swing' },
  { topic: 'fitness', tiers: ['senior_player'], title: 'Shoulder Flexibility for Seniors: Stay Loose and Swing Free' },
]

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const indexParam = searchParams.get('index')
  const index = indexParam !== null ? parseInt(indexParam) : null

  try {
    // Get existing article titles
    const { data: existing } = await supabase.from('articles').select('title')
    const existingTitles = new Set((existing || []).map(a => a.title))

    let articlePlan = null

    if (index !== null && ARTICLE_PLAN[index]) {
      articlePlan = ARTICLE_PLAN[index]
    } else {
      for (let i = 0; i < ARTICLE_PLAN.length; i++) {
        if (!existingTitles.has(ARTICLE_PLAN[i].title)) {
          articlePlan = ARTICLE_PLAN[i]
          break
        }
      }
    }

    if (!articlePlan) {
      return NextResponse.json({
        success: true,
        message: `All ${ARTICLE_PLAN.length} articles are generated!`
      })
    }

    // Generate article content
    const prompt = `Write a practical golf instruction article for the following:

Title: ${articlePlan.title}
Topic: ${articlePlan.topic}
Skill levels: ${articlePlan.tiers.join(', ')}

Write 400-500 words of practical, actionable advice. Use ## for section headers. Be specific and helpful.
Also write a 1-2 sentence summary of the article.

Respond in this exact JSON format:
{
  "content": "full article text here",
  "summary": "brief summary here",
  "read_time_minutes": 3
}`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Get shot types and category from mappings
    const shotTypes = TOPIC_SHOT_TYPES[articlePlan.topic] || []
    const category = TOPIC_CATEGORY[articlePlan.topic] || 'instruction'

    const { error } = await supabase.from('articles').insert({
      title: articlePlan.title,
      topic: articlePlan.topic,
      skill_tiers: articlePlan.tiers,
      content: parsed.content,
      summary: parsed.summary,
      read_time_minutes: parsed.read_time_minutes || 3,
      shot_type: shotTypes,
      category: category,
    })

    if (error) throw error

    const remaining = ARTICLE_PLAN.length - (existingTitles.size + 1)
    return NextResponse.json({
      success: true,
      title: articlePlan.title,
      topic: articlePlan.topic,
      category: category,
      shot_type: shotTypes,
      remaining
    })

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}