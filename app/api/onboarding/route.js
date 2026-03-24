import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a friendly golf AI assistant running a short skill assessment inside MyGolf Companion, an app that recommends golf instruction videos.

Your job is to assess the user's skill level through a natural 3-5 message conversation, then tell them which tier their content will be filtered to.

The three tiers are:
- beginner (label: "Getting Started") — for players new to golf, still learning basics
- intermediate (label: "Building Consistency") — for players who can get around the course but want to lower their scores
- advanced (label: "Sharpening Your Game") — for lower-handicap players focused on refinement

Ask friendly, concise questions to understand:
1. Their experience (rounds played, years playing)
2. Their current level (e.g. can they break 100? 90? 80?)
3. Their main challenge areas

After 3-4 exchanges, conclude with a warm summary like:
"Great! Based on your answers, I'm matching you to our [TIER_LABEL] content. Head back to the main page to see your personalized videos!"

IMPORTANT: When you deliver the final assessment, include this exact marker on its own line at the end of your message:
<<<SKILL_LEVEL:beginner>>> or <<<SKILL_LEVEL:intermediate>>> or <<<SKILL_LEVEL:advanced>>>

Keep responses short (2-3 sentences), conversational, and encouraging. Ask one question at a time.`

function parseSkillLevel(text) {
  const match = text.match(/<<<SKILL_LEVEL:(beginner|intermediate|advanced)>>>/)
  if (match) {
    const skillLevel = match[1]
    const reply = text.replace(/<<<SKILL_LEVEL:[^>]+>>>/, '').trim()
    return { reply, skillLevel }
  }
  return { reply: text, skillLevel: null }
}

export async function POST(req) {
  try {
    const { messages } = await req.json()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages:
        messages.length === 0
          ? [{ role: 'user', content: 'Start the assessment' }]
          : messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
    })

    const rawText =
      response.content[0].type === 'text'
        ? response.content[0].text
        : "Hi! I had trouble connecting. Have you ever played a full 18-hole round?"

    const { reply, skillLevel } = parseSkillLevel(rawText)

    return NextResponse.json({ reply, skillLevel })
  } catch (err) {
    console.error('Onboarding API error:', err)
    return NextResponse.json({
      reply: "Hi! I'm your Golf AI Companion. Let's find the right content for your game. Have you ever played a full 18-hole round of golf?",
      skillLevel: null,
    })
  }
}