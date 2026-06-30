import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// /api/ask-the-pro — backs the MyGolf Companion iOS app's Ask The Pro
// chat. Keeps the Anthropic key server-side instead of embedded in
// the iOS binary. Mirrors the rate-limit pattern from MyRecipe's
// /api/chef route.
export async function POST(request) {
  const rl = await checkRateLimit(request, 'ask-the-pro', 30)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { question } = await request.json()
  if (!question || typeof question !== 'string') {
    return Response.json({ error: 'Missing question' }, { status: 400 })
  }

  const prompt = `You are a friendly, knowledgeable golf pro. Answer this golfer's question clearly and practically, with actionable tips. Keep it conversational, under 150 words.\n\nQuestion: ${question}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ reply: response.content[0].text })
}