import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const rl = await checkRateLimit(request, 'generate-game-card', 20)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { situationTitle, golferNames } = await request.json()
  if (!situationTitle || !Array.isArray(golferNames) || golferNames.length === 0) {
    return Response.json({ error: 'Missing situationTitle or golferNames' }, { status: 400 })
  }

  const names = golferNames.join(', ')
  const [g1, g2, g3, g4] = golferNames

  const prompt = `Four weekend golfers: ${names}. Situation: ${situationTitle}.

Each golfer gets one ruling. Write exactly what their buddy says to them on the course.

RULES:
- Start with the golfer's name
- Maximum 8 words after the name
- No explanation, no story, just the call
- Each one different — some lenient, some strict, some funny, some clueless
- Sound like a buddy, not a rulebook

PERFECT examples:
- "John, kick it out."
- "Bill, just drop it in the fairway."
- "Keith, ask John."
- "Art, pick it up — you got a five."
- "Bill, move it a foot, nobody's watching."
- "John, that's a drop, add one."
- "Keith, do whatever you want."
- "Art, throw it back out, you're fine."

Then one real USGA rule — plain English, under 12 words.

Return ONLY valid JSON:
{
  "situation": "${situationTitle}",
  "takes": [
    { "golfer": "${g1}", "rule": "ruling" },
    { "golfer": "${g2}", "rule": "ruling" },
    { "golfer": "${g3}", "rule": "ruling" },
    { "golfer": "${g4}", "rule": "ruling" }
  ],
  "real_rule": "the real rule"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a JSON API. Return only raw valid JSON with no markdown, no code fences, no backticks, no preamble, no text after the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ result: response.content[0].text })
}
