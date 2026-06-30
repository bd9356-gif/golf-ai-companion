import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// /api/explain-video — backs the "Want AI to Explain This?" prompt
// that fires when a golfer saves a video in Golf TV. Takes the
// video's title and returns a written explanation, reinforcing
// what the video teaches.
export async function POST(request) {
  const rl = await checkRateLimit(request, 'explain-video', 20)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { videoTitle } = await request.json()
  if (!videoTitle || typeof videoTitle !== 'string') {
    return Response.json({ error: 'Missing videoTitle' }, { status: 400 })
  }

  const prompt = `You are a friendly, knowledgeable golf pro. A golfer just saved this video and wants it explained: "${videoTitle}". Give a clear, practical written explanation with actionable tips, as if teaching the topic the video covers. Keep it conversational, under 150 words.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ explanation: response.content[0].text })
}