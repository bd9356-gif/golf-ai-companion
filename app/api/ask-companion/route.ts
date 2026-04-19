import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TIER_LABELS: Record<string, string> = {
  beginner: 'a beginner golfer just getting started',
  intermediate: 'an intermediate golfer building consistency',
  advanced: 'an advanced golfer sharpening their game',
  all: 'a golfer of unspecified level',
}

export async function POST(req: NextRequest) {
  try {
    const { messages, skillLevel } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const tierDescription = TIER_LABELS[skillLevel] ?? TIER_LABELS['all']

    const systemPrompt = `You are MyGolf Companion, a friendly and knowledgeable AI golf coach built into the MyGolf Companion app. You help golfers improve their game through practical, actionable advice.

The user is ${tierDescription}.

Your role:
- Give clear, practical golf instruction tailored to the user's skill level
- Focus on the most common issues and fixes relevant to their level
- Use simple language — avoid overly technical jargon unless the user seems advanced
- Be encouraging and positive, like a supportive coach
- Keep answers focused and actionable — users want to improve, not read essays
- When relevant, mention that the Video Library tab has curated instructional videos that may help
- Do not make up specific statistics or claim to know course conditions

Keep responses concise (2-4 short paragraphs typically). Use plain text — no markdown headers or bullet point lists, just natural conversational paragraphs.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const reply =
      response.content[0].type === 'text'
        ? response.content[0].text
        : 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Ask Companion API error:', err)
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    )
  }
}
