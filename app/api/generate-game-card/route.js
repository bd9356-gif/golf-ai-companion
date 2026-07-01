import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHARACTERS = [
  { type: "doesn't care", voice: "waves it off, doesn't care, just wants to keep moving" },
  { type: "half-remembers", voice: "half-remembers seeing something like this on TV once, sounds confident but probably wrong" },
  { type: "makes it up", voice: "completely makes up a rule that sounds official but isn't" },
  { type: "just picks it up", voice: "just picks it up and gives himself a number, done" },
]

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5)
}

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
  const seed = Math.floor(Math.random() * 9999)

  // Randomly assign a character type to each golfer
  const shuffled = shuffle([...CHARACTERS])
  const assignments = golferNames.map((name, i) => ({
    name,
    character: shuffled[i % shuffled.length]
  }))

  let prompt

  if (oneRuleForAll) {
    const char = shuffled[0]
    prompt = `[Session: ${seed}] Golf situation: ${situationTitle}. Group: ${names}.

You are writing one line of dialogue. The loudest guy in the group is the type who ${char.voice}.

Write exactly ONE line he says to the whole group about this situation.
- Max 10 words
- No golf rule terminology whatsoever  
- Sounds like a real person talking, not a rulebook
- Start with "Alright" or "Everyone" or just dive straight in

Only return the line of dialogue. Nothing else.

Then separately, give the real USGA rule in plain English under 12 words.

Return ONLY valid JSON:
{
  "situation": "${situationTitle}",
  "group_rule": "one line of dialogue",
  "real_rule": "real rule"
}`
  } else {
    const characterLines = assignments.map(a =>
      `- ${a.name} is the guy who ${a.character.voice}. Write his ONE line about ${situationTitle}. Start with "${a.name}," and keep it under 10 words total.`
    ).join('\n')

    prompt = `[Session: ${seed}] Golf situation: ${situationTitle}.

You are writing dialogue for four different guys in a golf group. Each has a distinct personality. Write exactly what each one says when ${situationTitle} happens.

${characterLines}

Rules for ALL lines:
- Never use real golf terminology (no "unplayable", "penalty stroke", "relief", "lateral", "stroke and distance")
- Sound like actual people talking
- Short, punchy, done

Then the real USGA rule in plain English under 12 words.

Return ONLY valid JSON:
{
  "situation": "${situationTitle}",
  "takes": [
    ${assignments.map(a => `{ "golfer": "${a.name}", "rule": "his line" }`).join(',\n    ')}
  ],
  "real_rule": "real rule"
}`
  }

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: 'You are a JSON API writing casual dialogue for a golf app. Return only raw valid JSON. No markdown, no code fences, no extra text.',
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ result: response.content[0].text })
}
