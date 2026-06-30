cat > ~/golf-ai-companion/app/api/generate-game-card/route.js << 'ENDOFFILE'
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

  const prompt = `Golf situation: "${situationTitle}". Golfers in the group: ${names}.

Each golfer in the group has their own take on what to do in this situation. Write one ruling per golfer — casual, first-person address using their name, like a buddy calling it at the course.

The tone is exactly like these examples:
- "John, you hit it in the water—it doesn't count. Just drop one up by the green."
- "John, just throw another ball over there. Nobody cares where it crossed."
- "John, it's a red stake. That means you can drop anywhere over here."

Rules for each ruling:
- Start with the golfer's name
- One sentence, under 15 words
- Sounds like a different guy giving his take — some dismissive, some permissive, some half-know-the-rule, some totally wrong
- No rulebook language, no "the player shall", no formal tone
- Random variety — each one should feel like a different personality
- No two rulings should sound the same

Then write the REAL golf rule — one plain English sentence, accurate USGA/R&A, under 15 words.

Return ONLY valid JSON, no markdown, no extra text:
{
  "situation": "${situationTitle}",
  "takes": [
    { "golfer": "${golferNames[0]}", "rule": "the ruling" }
  ],
  "real_rule": "the actual rule in one sentence"
}
Include all ${golferNames.length} golfers in takes, in this order: ${names}.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a JSON API. Return only raw valid JSON with no markdown, no code fences, no backticks, no preamble, no text after the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ result: response.content[0].text })
}
ENDOFFILE