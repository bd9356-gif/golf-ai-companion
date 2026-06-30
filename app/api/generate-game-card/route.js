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

  const prompt = `You are writing what four weekend golfers actually say to each other on the course when ${situationTitle} happens. Not what the rules say — what the guys in the group actually say.

Golfers: ${names}.

Write one line for each golfer. Each line is what THAT golfer says out loud to the group. Use their name at the start. Sound exactly like these real examples:
- "Bill, you hit it in the water — it doesn't count. Just drop one up by the green."
- "John, just throw another ball over there. Nobody cares where it crossed."
- "Keith, it's a red stake, you can drop anywhere over here, just add one."
- "Art, that's a lateral — drop within two club lengths and keep moving."

NEVER write:
- Formal phrases like "drop at crossing point" or "relief options" or "provisional"
- Anything that sounds like a rule book
- More than one sentence per golfer

Each golfer should sound like a DIFFERENT person — one who waves it off, one who half-knows the rule, one who just makes something up, one who's seen it on TV once.

Then write the real USGA rule in one plain casual sentence.

Return ONLY valid JSON:
{
  "situation": "${situationTitle}",
  "takes": [
    { "golfer": "${g1}", "rule": "what ${g1} actually says" },
    { "golfer": "${g2}", "rule": "what ${g2} actually says" },
    { "golfer": "${g3}", "rule": "what ${g3} actually says" },
    { "golfer": "${g4}", "rule": "what ${g4} actually says" }
  ],
  "real_rule": "the actual rule in plain English"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a JSON API. Return only raw valid JSON with no markdown, no code fences, no backticks, no preamble, no text after the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ result: response.content[0].text })
}
