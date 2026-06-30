import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// /api/driving-range-guide — backs the Driving Range topic guides in
// the MyGolf Companion iOS app.
export async function POST(request) {
  const rl = await checkRateLimit(request, 'driving-range-guide', 20)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { topic } = await request.json()
  if (!topic || typeof topic !== 'string') {
    return Response.json({ error: 'Missing topic' }, { status: 400 })
  }

  const prompt = `Write a short, practical golf guide on ${topic}. Keep it under 250 words, friendly tone, with 3-4 actionable tips. No markdown formatting, just plain readable text with clear paragraph breaks.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ guide: response.content[0].text })
}