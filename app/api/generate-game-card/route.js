import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// /api/generate-game-card — backs I Had a Five™'s "Settle It" button.
// Takes the situation + golfer names, returns the Casual Code of
// Conduct JSON (one ruling per golfer + the real USGA rule).
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

You are drafting an entry in this group's "Casual Code of Conduct" — their own house rulebook for weekend golf. It reads like a real rulebook: structured, titled, disciplined — but clearly written by four buddies who play by their own standards, not the USGA's.

Write ONE house rule for EACH golfer for this situation. Each should sound like a confident, official-sounding ruling — short, declarative, like a clause in a rulebook — under 14 words, no jokes for the sake of jokes, just dry deadpan confidence. Each golfer's ruling should have a slightly different angle or standard.

Then write the REAL golf rule for this situation — one sentence, under 15 words, plain English, accurate to USGA/R&A rules.

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