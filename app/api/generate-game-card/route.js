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

  const { situationTitle, golferNames, oneRuleForAll } = await request.json()
  if (!situationTitle || !Array.isArray(golferNames) || golferNames.length === 0) {
    return Response.json({ error: 'Missing situationTitle or golferNames' }, { status: 400 })
  }

  const names = golferNames.join(', ')
  const [g1, g2, g3, g4] = golferNames
  const seed = Math.floor(Math.random() * 9999)

  let prompt

  if (oneRuleForAll) {
    prompt = `[Session: ${seed}] Four weekend golfers: ${names}. Situation: ${situationTitle}.

Write ONE thing the loudest guy in the group says to everyone. This is NOT the real rule — it's what the group actually does on Saturday.

RULES:
- Address the whole group
- Maximum 10 words
- Sound like a buddy, not a rulebook
- Must be a made-up house ruling, never the real USGA rule

NEVER write the actual rule. Write what the group does instead.

PERFECT examples:
- "Alright everyone, kick it out, no penalty."
- "We're all dropping in the fairway, move it."
- "Everyone gets a foot, that's it, let's go."
- "Pick it up, give yourself a five, keep moving."
- "Nobody's counting that one, just drop it and go."

Then the real USGA rule in one plain English sentence under 12 words.

Return ONLY valid JSON:
{
  "situation": "${situationTitle}",
  "group_rule": "what the group actually does",
  "real_rule": "the real rule"
}`
  } else {
    prompt = `[Session: ${seed}] Four weekend golfers: ${names}. Situation: ${situationTitle}.

Each golfer gets one ruling. Write exactly what their buddy says to them on the course.

RULES:
- Start with the golfer's name
- Maximum 8 words after the name
- No explanation, no story, just the call
- Each one different — some lenient, some strict, some funny, some clueless
- Sound like a buddy, not a rulebook

NEVER USE THESE WORDS OR PHRASES:
- "unplayable lie"
- "penalty stroke"
- "relief"
- "drop zone"
- "lateral"
- "stroke and distance"
- any official golf rule terminology

PERFECT examples:
- "John, kick it out."
- "Bill, just drop it in the fairway."
- "Keith, ask John."
- "Art, pick it up — you got a five."
- "Bill, move it a foot, nobody's watching."
- "John, toe it out, nobody cares."
- "Keith, do whatever you want."
- "Art, throw it back, we're not counting anyway."

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
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a JSON API. Return only raw valid JSON with no markdown, no code fences, no backticks, no preamble, no text after the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ result: response.content[0].text })
}
