import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TIER_LABELS = {
  beginner: 'Beginner (just starting out)',
  building_game: 'Building Your Game (scoring 100+)',
  building_consistency: 'Building Consistency (scoring 90-100)',
  improving_player: 'Improving Player (scoring 80-90)',
  advanced_player: 'Advanced Player (scoring 70-80)',
  senior_player: 'Senior Player (focusing on mobility and rhythm)',
}

// Articles to generate — topic, tiers, and title
const ARTICLE_PLAN = [
  // Swing tips & drills
  { topic: 'swing', tiers: ['beginner', 'building_game'], title: '5 Simple Swing Tips Every New Golfer Needs to Know' },
  { topic: 'swing', tiers: ['building_consistency', 'improving_player'], title: 'How to Stop Coming Over the Top and Finally Hit a Draw' },
  { topic: 'swing', tiers: ['improving_player', 'advanced_player'], title: 'The Impact Position Secret That Separates Good Golfers from Great Ones' },
  { topic: 'swing', tiers: ['senior_player'], title: 'The Effortless Swing: How Senior Golfers Can Generate Power Without Strain' },
  { topic: 'swing', tiers: ['beginner', 'building_game', 'building_consistency'], title: 'Why Your Grip is Costing You Distance (And How to Fix It)' },
  // Course management
  { topic: 'course management', tiers: ['building_game', 'building_consistency'], title: 'Stop Losing Strokes to Bad Decisions: A Beginner\'s Guide to Course Management' },
  { topic: 'course management', tiers: ['improving_player', 'advanced_player'], title: 'How to Think Like a Tour Pro: Shot Selection Strategy for Breaking 80' },
  { topic: 'course management', tiers: ['senior_player', 'improving_player'], title: 'Playing Smart Golf: How to Score Better Without Hitting It Farther' },
  { topic: 'course management', tiers: ['building_consistency', 'improving_player'], title: 'The One Rule That Will Save You 5 Strokes Every Round' },
  // Mental game
  { topic: 'mental game', tiers: ['beginner', 'building_game'], title: 'How to Stay Calm on the Course When Everything Goes Wrong' },
  { topic: 'mental game', tiers: ['building_consistency', 'improving_player'], title: 'The Pre-Shot Routine That Eliminates Tension and Boosts Consistency' },
  { topic: 'mental game', tiers: ['improving_player', 'advanced_player'], title: 'How Tour Pros Handle Pressure: Mental Strategies for Competitive Golf' },
  { topic: 'mental game', tiers: ['senior_player'], title: 'Golf After 60: Why Your Mental Game Matters More Than Your Physical Game' },
  // Fitness & mobility
  { topic: 'fitness', tiers: ['beginner', 'building_game'], title: '10-Minute Golf Warmup Routine That Will Transform Your First Tee Shot' },
  { topic: 'fitness', tiers: ['building_consistency', 'improving_player'], title: 'The 3 Exercises That Will Add 20 Yards to Your Driver' },
  { topic: 'fitness', tiers: ['senior_player'], title: 'Golf Fitness for Seniors: 5 Gentle Exercises to Improve Your Swing at Any Age' },
  { topic: 'fitness', tiers: ['improving_player', 'advanced_player'], title: 'Hip Mobility Drills Every Golfer Should Do Daily' },
  { topic: 'fitness', tiers: ['senior_player', 'building_game'], title: 'How to Play 18 Holes Pain-Free: Joint-Friendly Golf Tips' },
]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const indexParam = searchParams.get('index')
    const index = indexParam !== null ? parseInt(indexParam) : null

    // Check which articles are already generated
    const { data: existing } = await supabase
      .from('articles')
      .select('title')

    const existingTitles = new Set((existing || []).map(a => a.title))

    // Find the next article to generate
    let articlePlan = null
    let articleIndex = -1

    if (index !== null && ARTICLE_PLAN[index]) {
      articlePlan = ARTICLE_PLAN[index]
      articleIndex = index
    } else {
      // Find first ungenerated
      for (let i = 0; i < ARTICLE_PLAN.length; i++) {
        if (!existingTitles.has(ARTICLE_PLAN[i].title)) {
          articlePlan = ARTICLE_PLAN[i]
          articleIndex = i
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

    const tierDescriptions = articlePlan.tiers
      .map(t => TIER_LABELS[t])
      .join(', ')

    const prompt = `You are an expert golf instructor writing a helpful, practical article for MyGolf Companion — an app that helps golfers improve their game.

Write a complete article with the following details:
- Title: "${articlePlan.title}"
- Topic: ${articlePlan.topic}
- Target audience: ${tierDescriptions}

Requirements:
- Length: 450-550 words
- Tone: Friendly, encouraging, practical — like advice from a knowledgeable playing partner
- Structure: Short intro, 3-4 practical tips or sections with subheadings, brief conclusion
- Use specific golf terminology where appropriate
- Each tip should be immediately actionable
- No fluff, no generic advice — be specific and useful
- Do NOT include the title in the article body

Also write a 1-2 sentence summary of the article (used as a preview card).

Return ONLY a JSON object like this with no markdown or backticks:
{
  "summary": "One to two sentence preview of the article.",
  "content": "Full article content here with markdown formatting (## for subheadings, **bold** for emphasis)."
}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].text
    let result
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      result = JSON.parse(clean)
    } catch {
      return NextResponse.json({ success: false, error: 'JSON parse failed', raw: text })
    }

    // Calculate read time (average 200 words per minute)
    const wordCount = result.content.split(' ').length
    const readTime = Math.max(1, Math.round(wordCount / 200))

    const { error: insertError } = await supabase
      .from('articles')
      .upsert({
        title: articlePlan.title,
        topic: articlePlan.topic,
        skill_tiers: articlePlan.tiers,
        summary: result.summary,
        content: result.content,
        read_time_minutes: readTime,
      }, { onConflict: 'title' })

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message })
    }

    const remaining = ARTICLE_PLAN.length - (existingTitles.size + 1)

    return NextResponse.json({
      success: true,
      message: `Generated: "${articlePlan.title}". ${remaining} remaining.`,
      index: articleIndex,
      remaining
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}