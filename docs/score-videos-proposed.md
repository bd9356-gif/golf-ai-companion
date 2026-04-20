# Proposed changes to `/api/score-videos` (Phase C)

_Companion to `docs/video-schema-review.md` and `supabase/005_video_schema.sql`._

Two changes to `app/api/score-videos/route.js`:

1. **Prompt** — ask Claude for `primary_bucket`, `sub_tags`, `quality_reason` on top of the existing fields.
2. **Post-scoring gate** — write to the new columns and auto-promote `videos.editorial_status` to `'approved'` when `quality_score >= 7`, else leave it at `'starter'` for you to review.

---

## 1. New prompt template

```js
const PROMPT_TEMPLATE = (title, channel, description) => `You are a golf instruction expert. Analyze this YouTube video and return ONLY a JSON object with no markdown or backticks.

Video title: ${title}
Channel: ${channel}
Description: ${description}

NOTE: Ignore promotional content, social media links, or channel boilerplate. Focus only on the golf instruction. If description says '(No description available)', base your analysis entirely on the video title.

Return this exact JSON structure:
{
  "primary_bucket": "full_swing",
  "sub_tags": ["driver","tempo"],
  "skill_tiers": ["beginner"],
  "topics": ["driving"],
  "ai_summary": "summary here",
  "quality_score": 7.5,
  "quality_reason": "one-line justification"
}

Rules:

- primary_bucket (REQUIRED, exactly one of):
    full_swing          -- driving, iron play, tempo, grip, stance, full-swing drills, fundamentals
    short_game          -- chipping, pitching, bunker play, greenside wedges, ~50y and in
    putting             -- putting stroke, reading greens, lag putting, distance control
    course_management   -- strategy, mental game, scoring, pre-shot routine, club selection, on-course decisions
  Pick the SINGLE best fit. Fitness and mental-game videos both map to course_management (or to the relevant physical bucket if the drill is swing-specific).

- sub_tags: array of 1-5 fine-grained tags. Choose from:
    driver, iron, wedge, hybrid, 3-wood, fairway-wood, tempo, grip, stance, posture,
    takeaway, backswing, downswing, impact, follow-through, release, shallowing,
    chipping, pitching, bunker, flop, lob, chunk-fix, thin-fix,
    putting-stroke, green-reading, lag-putting, short-putt, speed-control,
    strategy, mental, pre-shot-routine, course-management, club-selection,
    fitness, mobility, senior

- skill_tiers: array, choose from ONLY these exact values:
    beginner, building_game, building_consistency, improving_player, advanced_player, senior_player

    - "beginner" = complete newcomers, very basic fundamentals
    - "building_game" = high handicappers scoring 100+, basic consistency
    - "building_consistency" = scoring 90-100, inconsistent fundamentals
    - "improving_player" = scoring 80-90, solid fundamentals, working on scoring
    - "advanced_player" = scoring 70-80, low handicap, shot shaping and strategy
    - "senior_player" = older golfers focusing on mobility, flexibility, slower swing speed, joint-friendly mechanics, rhythm over power

  Include ALL tiers the video genuinely applies to.

- topics: array of 1-3 from the legacy vocabulary (kept for backward compat):
    driving, iron play, short game, putting, chipping, pitching, bunker,
    course management, mental game, fitness, rules, equipment, grip, stance, swing

- quality_score: 1-10
- quality_reason: ONE short sentence explaining the score (e.g. "Clear demo, well-shot, but covers ground already in other putting basics videos.")
- ai_summary: 2-3 specific sentences. Exact problem solved, technique taught, who it is for. No generic summaries.

Return ONLY the JSON, nothing else`
```

---

## 2. New upsert + auto-approve

Replace the existing upsert block with:

```js
const AUTO_APPROVE_THRESHOLD = 7

// Validate primary_bucket before writing
const VALID_BUCKETS = new Set(['full_swing','short_game','putting','course_management'])
const bucket = VALID_BUCKETS.has(result.primary_bucket) ? result.primary_bucket : null

// 1. Write enrichment
const { error: metaError } = await supabase
  .from('video_metadata')
  .upsert({
    video_id: unscoredVideo.id,
    skill_tiers: result.skill_tiers,
    topics: result.topics,
    sub_tags: Array.isArray(result.sub_tags) ? result.sub_tags : [],
    ai_summary: result.ai_summary,
    quality_score: result.quality_score,
    quality_reason: result.quality_reason || null,
    status: 'approved'
  }, { onConflict: 'video_id' })

if (metaError) {
  return NextResponse.json({ success: false, error: metaError.message, remaining })
}

// 2. Stamp bucket + editorial_status on the video
const score = Number(result.quality_score) || 0
const shouldApprove = bucket && score >= AUTO_APPROVE_THRESHOLD

const { error: videoError } = await supabase
  .from('videos')
  .update({
    primary_bucket: bucket,
    editorial_status: shouldApprove ? 'approved' : 'starter'
  })
  .eq('id', unscoredVideo.id)

if (videoError) {
  return NextResponse.json({ success: false, error: videoError.message, remaining })
}

return NextResponse.json({
  success: true,
  message: `Scored "${unscoredVideo.title}" → ${bucket || 'unbucketed'} · q=${score} · ${shouldApprove ? 'approved' : 'starter'}. ${remaining - 1} remaining.`
})
```

---

## Rollout recommendation

1. Run `supabase/005_video_schema.sql` in the Supabase SQL editor.
2. Swap in the new route file (above).
3. Kick off the scorer against ~40 videos. Eyeball the `primary_bucket` column — does the split feel right?
4. If yes: run the full pass. If not: adjust the bucket guidance in the prompt and re-score the 40.
5. Everything scoring < 7 lands in `editorial_status = 'starter'` — that's your review queue for phase G.

Nothing is user-visible yet. Golf TV still runs off the old `topics` string matching until phase E.
