import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate_limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// /api/ihaf-generate — two modes:
// mode: "surprise" — AI picks a fun challenge for the group
// mode: "callout" — AI writes a one-line winner announcement

export async function POST(request) {
  const rl = await checkRateLimit(request, 'ihaf-generate', 20)
  if (!rl.ok) {
    return Response.json({ error: rl.message }, { status: 429 })
  }

  const { mode, challenge, winner, winnerScore, golfers } = await request.json()

  let prompt

  if (mode === 'surprise') {
    const seed = Math.floor(Math.random() * 9999)
    prompt = `[${seed}] You are creating a fun weekly challenge for a group of weekend golfers. 
    
Their existing challenges are: Gimmes, Breakfast Balls, Foot Wedges, Gallery Rule, Sand Saves, Water Do-overs, Mulligans.

Create ONE new fun challenge that's different from those. It should be:
- Something that happens naturally during a round
- Easy to count with honor system
- Funny and relatable to weekend golfers
- Under 6 words for the name
- One sentence description under 12 words

Return ONLY valid JSON:
{
  "name": "Challenge Name",
  "description": "One sentence description.",
  "emoji": "single relevant emoji"
}`
  } else if (mode === 'callout') {
    const seed = Math.floor(Math.random() * 9999)
    prompt = `[${seed}] Weekend golf group just finished their "${challenge}" challenge. 
Winner: ${winner} with ${winnerScore}.
Other players: ${golfers.filter(g => g.name !== winner).map(g => `${g.name}: ${g.score}`).join(', ')}.

Write ONE short funny line announcing the winner. Under 20 words. 
Sound like a buddy at the 19th hole, not a sports announcer.
Use the winner's name. Reference the challenge if it's funny.
No quotes, no preamble, just the line.`
  }

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    system: mode === 'surprise' 
      ? 'You are a JSON API. Return only raw valid JSON, no markdown, no extra text.'
      : 'Return only the one-line announcement. No quotes. No extra text.',
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].text.trim()

  if (mode === 'surprise') {
    try {
      const parsed = JSON.parse(text)
      return Response.json({ challenge: parsed })
    } catch {
      return Response.json({ error: 'Failed to parse challenge' }, { status: 500 })
    }
  } else {
    return Response.json({ callout: text })
  }
}
