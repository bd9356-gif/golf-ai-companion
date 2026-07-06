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

  const { question, videoTitle, videoContext } = await request.json()
  if (!question || typeof question !== 'string') {
    return Response.json({ error: 'Missing question' }, { status: 400 })
  }

  // When called from My Bag's focused "Ask about this" box, videoTitle
  // (and optionally videoContext, the existing AI explanation if one was
  // generated) are included so the answer stays anchored to the specific
  // skill/video the golfer is actively working on, not a generic answer.
  const prompt = videoTitle
    ? `You are a friendly, knowledgeable golf pro. A golfer is actively working on a specific skill using this video as their focus: "${videoTitle}".${videoContext ? `\n\nHere's the explanation already given for this video:\n${videoContext}` : ''}\n\nThey have a follow-up question about it. Answer clearly and practically, staying anchored to this specific video/skill rather than giving a generic answer. Keep it conversational, under 150 words.\n\nQuestion: ${question}`
    : `You are a friendly, knowledgeable golf pro. Answer this golfer's question clearly and practically, with actionable tips. Keep it conversational, under 150 words.\n\nQuestion: ${question}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ reply: response.content[0].text })
}