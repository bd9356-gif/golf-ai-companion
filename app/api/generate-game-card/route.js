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

  const { situationTitle } = await request.json()
  if (!situationTitle) {
    return Response.json({ error: 'Missing situationTitle' }, { status: 400 })
  }

  const seed = Math.floor(Math.random() * 9999)

  const prompt = `[Session: ${seed}] Golf situation: ${situationTitle}.

Write 5 different short options for what a weekend golfer does in this situation. These are house rules — not the real rule. Short, plain, direct. What the guy actually does on Saturday.

Examples for "In the Woods":
- "Kick it out, no penalty"
- "Drop it in the fairway, take one"
- "Move it a foot and play it"
- "Pick it up, give yourself a five"
- "Do whatever you want, nobody's counting"

Keep every option under 8 words. No golf terminology. Just plain English.

Then the real USGA rule in one plain sentence under 12 words.

Return ONLY valid JSON:
{
  "situation": "${situationTitle}",
  "options": [
    "option 1",
    "option 2", 
    "option 3",
    "option 4",
    "option 5"
  ],
  "real_rule": "the real rule"
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: 'You are a JSON API. Return only raw valid JSON with no markdown, no code fences, no extra text.',
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ result: response.content[0].text })
}
