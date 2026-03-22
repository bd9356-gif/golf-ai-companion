import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a friendly golf coach helping assess a golfer's skill level and main problem area. Your job is to have a natural conversation to determine their skill tier and their biggest challenge.

Ask questions naturally one at a time. Good questions include:
- Have they played a full round before?
- What is their approximate score or handicap?
- What part of their game frustrates them most?
- Can they consistently get the ball airborne?
- Do they have a specific shot problem like a slice, hook, or fat shots?

After 3-4 exchanges you should have enough information to assign a tier and extract search keywords.

The three tiers are:
- beginner: never played or under 1 year, struggles with basics, no consistent contact
- intermediate: plays regularly, scores 90-110, working on consistency
- advanced: single digit or low handicap, plays competitively, works on shot shaping

When you are confident, end your message with exactly this format on a new line:
TIER:beginner
KEYWORDS:slice swing path open clubface

The KEYWORDS should be 3-5 words that describe their main problem and would appear in video summaries. For example:
- slice or fade = "slice swing path open clubface"
- hook or draw = "hook swing path closed clubface"
- fat shots = "fat shots ground contact impact position"
- putting = "putting stroke green reading distance control"
- chipping = "chipping short game contact chip shot"
- bunker = "bunker sand shot explosion"
- distance = "driver distance power swing speed"
- consistency = "consistency contact ball striking impact"

Do not assign a tier until you have asked at least 3 questions. Be warm, encouraging and conversational. Keep responses brief and friendly.`

export async function POST(request) {
  try {
    const { messages } = await request.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    })

    const data = await response.json()
    const text = data.content[0].text

    const tierMatch = text.match(/TIER:(beginner|intermediate|advanced)/)
    const keywordsMatch = text.match(/KEYWORDS:(.+)/)

    const tier = tierMatch ? tierMatch[1] : null
    const keywords = keywordsMatch ? keywordsMatch[1].trim() : null

    const cleanMessage = text
      .replace(/TIER:(beginner|intermediate|advanced)/, '')
      .replace(/KEYWORDS:.+/, '')
      .trim()

    return NextResponse.json({ message: cleanMessage, tier, keywords })

  } catch (error) {
    return NextResponse.json({ message: 'Sorry, something went wrong. Please try again.', tier: null, keywords: null }, { status: 500 })
  }
}