# Golf Video Database — Schema Review & Migration Plan

_Bill D · April 2026_

## TL;DR

The good news: the bones are here. The `videos` + `video_metadata` tables already carry the content, Claude has been scoring quality, and the "new saves land in The Starter" flow is wired end-to-end. The bad news: **nothing in the database actually knows what skill bucket a video belongs to**, and **there is no pro record anywhere** — just a free-text `channel_name` string pulled off YouTube. Both of those are the core of what you're asking for.

This document:

1. Reports what exists today.
2. Walks through each of your seven confirmation bullets and marks it ✅ / ⚠️ / ❌.
3. Proposes a concrete schema migration, a pro-attribution model (parallel to how we'd eventually handle chefs on the recipe side), and a quality-surfacing model.
4. Sequences the work into small, revertable phases.

Nothing has been changed yet. This is for your sign-off.

> **Status: shipped.** Phases A–G are live as of April 2026. See the "Shipped log" at the bottom of this file for what was actually built vs. what was planned.

---

## 1 · What the database looks like right now

### Content tables (system-wide)

| Table | Purpose | Key fields |
|---|---|---|
| `videos` | Every ingested YouTube video | `id`, `title`, `url`, `thumbnail_url`, `youtube_video_id`, `channel_name`, `description`, `published_at` |
| `video_metadata` | Claude-generated enrichment per video | `video_id` FK, `skill_tiers` (json array), `topics` (json array), `ai_summary`, `quality_score` (1–10), `status` |
| `articles` | Longform guides (AI-written) | `id`, `title`, `topic`, `skill_tiers`, `content`, `summary`, `read_time_minutes`, `shot_type`, `category` |

### User-facing tables

| Table | Purpose |
|---|---|
| `saved_videos` / `saved_articles` / `saved_answers` | A user's personal library |
| `focus_leaves` | A user's five buckets (Holding Bucket = "The Starter", Full Swing, Short Game, Putting, Course Management). **Per-user, not global.** |
| `leaf_items` | Which saved video/article/answer lives in which bucket (per user) |
| `cart_items` | My Plan — today's focus items |

### Ingestion & enrichment pipeline

| Route | What it does |
|---|---|
| `POST /api/fetch-videos` | Runs 98 hardcoded YouTube search queries, upserts into `videos` by `youtube_video_id` |
| `POST /api/score-videos` | Finds the next un-scored video, asks Claude Haiku for `skill_tiers` + `topics` + `ai_summary` + `quality_score`, upserts into `video_metadata` |
| `POST /api/backfill-descriptions` | Cleans truncated/noisy YouTube descriptions |
| `POST /api/generate-article` | Claude Opus writes the next missing article from a 45-item plan |

### What the UI actually does with buckets today

The Golf TV page has a `CATEGORIES` array (Swing Tips, Putting, Short Game, Course Management, Mental Game, Fitness). Filtering a video into a category is done **client-side** by doing a `.includes()` on each string in `video_metadata.topics`. So `topics: ["driving", "swing"]` matches the "Swing Tips" chip because `"swing"` appears in `"swing tips"`.

**There is no stored mapping between a video and one of the four skill buckets.** The buckets (`Full Swing`, `Short Game`, `Putting`, `Course Management`) only exist as rows in each user's `focus_leaves` table.

---

## 2 · Gap analysis against your seven confirmation points

| # | Confirmation ask | Status | Gap |
|---|---|---|---|
| 1 | Every video fits into one of the four buckets | ❌ | No `primary_bucket` column on videos. Topic strings are fuzzy (`swing`, `driving`, `grip`…) and don't cleanly collapse to four buckets. No guarantee every video has a bucket. |
| 2 | Metadata is complete, consistent, bucket-friendly | ⚠️ | Claude enrichment exists, but the topic vocabulary is ~15 strings with overlap (e.g. `chipping` vs `short game`). Needs a canonical four-bucket taxonomy plus free-form sub-tags. |
| 3 | Video quality meets instructional standards | ⚠️ | `quality_score` exists (1–10) but is never used to filter/rank the Golf TV page — it's only used once, deep inside the guides page. Also purely AI-assessed; no editorial sign-off column. |
| 4 | Each video tied to a pro with proper attribution | ❌ | There is **no `pros` table**. We only have `videos.channel_name` as a free-text string pulled from YouTube. Two videos by the same pro on different channels get no shared record. |
| 5 | External pro links are supported | ❌ | Nowhere to store a website, academy URL, booking link, or headshot. |
| 6 | Surface and prioritize higher-quality content | ⚠️ | Quality score is written but not surfaced in filtering/sorting. No "featured" flag, no "editor's pick", no ranking field. |
| 7 | New videos enter through The Starter before assignment | ✅ | Already wired — `toggleSaved()` in Golf TV ensures the user's "Holding Bucket" leaf exists and appends the new item at the end. _But_ this is a user-level thing; at the library/global level there is no "unclassified" inbox for ops. |

---

## 3 · Proposed schema changes

Two new tables, plus columns added to two existing ones. Everything is additive and backward-compatible — existing app code keeps working while we migrate.

### 3.1 New table — `pros` (authoritative pro records)

```sql
create table pros (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- url-safe: 'rick-shiels', 'me-and-my-golf'
  display_name text not null,                   -- "Rick Shiels"
  headshot_url text,
  bio text,
  website_url text,                             -- primary external link (academy, personal site)
  booking_url text,                             -- optional "book a lesson" link
  youtube_channel_id text,                      -- for matching incoming videos
  youtube_channel_name text,                    -- denormalized for easy read
  pga_certified boolean default false,          -- editorial verification
  is_featured boolean default false,            -- "editor's pick" pros
  status text default 'active',                 -- 'active' | 'hidden' | 'pending'
  created_at timestamptz default now()
);

create index pros_slug_idx on pros (slug);
create index pros_youtube_channel_idx on pros (youtube_channel_id);
```

Mirrors the shape we'd want for chefs on the recipe side. Everything a video needs to give a pro meaningful visibility (headshot + name + website + booking link + featured flag) lives here.

### 3.2 New columns on `videos`

```sql
alter table videos
  add column if not exists pro_id uuid references pros(id) on delete set null,
  add column if not exists primary_bucket text
    check (primary_bucket in ('full_swing','short_game','putting','course_management')),
  add column if not exists is_featured boolean default false,
  add column if not exists editorial_status text default 'starter'
    check (editorial_status in ('starter','approved','hidden'));
```

- `pro_id` — nullable so ingestion doesn't fail. We backfill it by matching `videos.channel_name` → `pros.youtube_channel_name` (or by hand for small channels).
- `primary_bucket` — **this is the important one.** Each video gets exactly one of the four buckets. Claude writes this during scoring; editors can override. The app can now do `where primary_bucket = 'putting'` instead of fuzzy string matching.
- `is_featured` — editorial highlight; used to pin to the top of Golf TV.
- `editorial_status` — global "inbox" for ops. `'starter'` = just ingested, unreviewed. `'approved'` = shown to users. `'hidden'` = hidden everywhere.

### 3.3 New columns on `video_metadata`

```sql
alter table video_metadata
  add column if not exists sub_tags text[] default '{}',
  add column if not exists quality_reason text;
```

- `sub_tags` — fine-grained tags inside a bucket (e.g. `'driver'`, `'bunker'`, `'lag_putting'`). Keeps `primary_bucket` clean while still letting us search by shot type.
- `quality_reason` — Claude explains the score in one line. Lets editors spot-check bad scores.

### 3.4 Optional — `pro_videos_view`

A read-only view that joins `videos` + `video_metadata` + `pros`, so the app can stop doing the nested `.select()`. Nice-to-have, not required.

---

## 4 · How videos map to the four buckets (the taxonomy)

The current Claude `topics` vocabulary is 15 free-form strings. We keep it as `sub_tags` (useful for sub-filtering within a bucket) but **force a decision on exactly one bucket**. Proposed mapping:

| Primary bucket | Covers |
|---|---|
| `full_swing` | Driving, iron play, tempo, grip, stance, full-swing drills, fundamentals |
| `short_game` | Chipping, pitching, bunker play, greenside wedges, ~50y and in |
| `putting` | Putting stroke, reading greens, lag putting, distance control |
| `course_management` | Strategy, mental game, scoring, pre-shot routine, club selection, on-course decisions |

"Fitness" stays as a sub-tag but is **not its own bucket** — it's a cross-cutting topic. Mental game folds into course management.

The Claude score-videos prompt gets updated to always output `primary_bucket` (required, one of four) plus `sub_tags` (array, 1–5 from an extended vocabulary).

---

## 5 · Pro attribution model

Two steps:

1. **Seed the `pros` table manually** for the 15–30 most-represented channels in the existing videos (one-time effort; probably 30 minutes of data entry or a single Claude pass over `select distinct channel_name from videos`). Each row gets a display name, website URL, headshot.
2. **Every future fetch backfills `pro_id` automatically** — when `/api/fetch-videos` writes a new video, we look up the pro by `youtube_channel_id` (or `_name` as fallback) and stamp it.

Videos from channels we haven't curated yet simply have `pro_id = null` — the UI shows the raw channel name as a fallback, same as today.

This mirrors the "chefs on the kitchen platform" model you referenced. The recipe app doesn't have a `chefs` table today either — when you're ready, we'd clone this exact pattern over there.

---

## 6 · Quality & surfacing model

Three layers, cheap to build:

1. **Approved gate.** Golf TV only shows `editorial_status = 'approved'`. Gives you an ops inbox of `'starter'` videos to review without hiding them from the DB.
2. **Featured pins.** `is_featured = true` videos sort to the top of Golf TV (and of each bucket).
3. **Quality rank.** Default sort inside a bucket is `quality_score desc, published_at desc`. The field already exists; we just start using it.

All three are independent. Featured is editorial; quality score is AI. You can override either.

---

## 7 · Proposed implementation sequence

Each phase is its own commit + migration, revertable.

| Phase | What | Risk |
|---|---|---|
| **A** | Migration SQL: create `pros`, add columns to `videos` and `video_metadata`. All new columns have defaults, so existing app code keeps working. | Low |
| **B** | Seed `pros` table from the distinct `channel_name` values in the live DB (Claude-assisted). Backfill `videos.pro_id`. | Low |
| **C** | Rewrite `/api/score-videos` prompt to include `primary_bucket` + `sub_tags` + `quality_reason`. Run against ~40 videos first to eyeball the bucket assignments; if good, run the full set. | Medium — worth reviewing Claude's first 40 outputs by hand before a full pass. |
| **D** | `/api/fetch-videos` auto-stamps `pro_id` on insert; new videos default to `editorial_status = 'starter'`. | Low |
| **E** | Golf TV page: filter by `editorial_status = 'approved'`, sort by `is_featured desc, quality_score desc`. Replace the "Swing Tips / Putting / …" chips with the four canonical bucket chips (+ "All"). | Medium — user-visible. |
| **F** | Pro attribution on video cards: channel name becomes a link to the pro's website when `pro_id` is set. Small "Pro" badge on videos attached to a featured or PGA-certified pro. | Low |
| **G** | Build a minimal internal `/admin/starter` page: list videos with `editorial_status = 'starter'`, let you approve / hide / edit bucket. Not user-facing. | Medium |

Phases A–D are backend-only; the app keeps working throughout. The user sees no change until phase E.

---

## 8 · Questions for you before I start cutting SQL

1. **Do you want "Fitness" and "Mental game" as chips on Golf TV, or just the four canonical buckets?** The current page has six chips. My recommendation is four chips + an "All" — cleaner — but fitness/mental-game videos would still be reachable via search + sub-tags.
2. **How hands-on do you want to be in the editorial loop?** If you want every video reviewed before it hits users, we keep phase G (admin page). If you're OK trusting Claude + the quality score to gate most of them, we can auto-approve anything with `quality_score ≥ 7` and send the rest to your inbox.
3. **For pro bios / headshots — are you OK writing those yourself for the top ~20 pros, or do you want Claude to draft them from their YouTube channel "About" page?**
4. **Do you want me to start with phase A (migration SQL) now so you have it ready to run, or wait for your decisions on the questions above?**

Once you answer those, I can produce the phase-A migration file + the updated Claude prompt and have a reviewable PR within the hour.

---

## 9 · Shipped log (April 2026)

Answers to the four open questions:

1. **Four chips only** — the legacy "Fitness" and "Mental game" chips were retired. Fitness/mental content surfaces via sub_tags and (where relevant) the `course_management` bucket.
2. **Auto-approve at `quality_score ≥ 7`**. Everything else lands in `editorial_status = 'starter'` for human review via `/admin/starter`.
3. **Claude drafts pro bios/headshots** — `/api/seed-pros` asks Claude Haiku to fill `display_name`, `bio`, `website_url`, `booking_url`, `pga_certified`. Prompt explicitly says "return null, do not invent" when Claude is unsure.
4. **Shipped phase A as soon as you signed off**, then the rest rolled out one phase at a time.

### What actually shipped

| Phase | What shipped | Notes |
|---|---|---|
| **A** | `supabase/005_video_schema.sql` — created `pros` table, added `pro_id`/`primary_bucket`/`is_featured`/`editorial_status` on videos, added `sub_tags`/`quality_reason` on video_metadata, added `video_with_pro` view. | ✅ |
| **B** | `/api/seed-pros` processes one un-seeded channel per call, drafts a pro record with Claude Haiku, inserts `status='pending'`, backfills `videos.pro_id`. | 29 pros seeded; ~58% of videos attributed (448 / 767). |
| **C** | `/api/score-videos` prompt now outputs `primary_bucket` (one of 4), `sub_tags` (1–5), `quality_reason`, plus the legacy `skill_tiers`/`topics`. Auto-approves at `quality_score ≥ 7`. | All 767 videos re-scored. Distribution: full_swing 566 / short_game 151 / putting 27 / course_management 23. Avg score 7.38. |
| **D** | `/api/fetch-videos` now calls `buildProIdMap()` and stamps `pro_id` on ingest so every new video auto-attributes. `editorial_status` intentionally omitted from the upsert payload to avoid downgrading approved videos on re-fetch. | ✅ |
| **E** | `/golf-tv/page.tsx` rebuilt: 5 chips (All + 4 buckets), strict `primary_bucket` equality (no more fuzzy `topics.includes`), filter on `editorial_status = 'approved'`, sort by `is_featured desc, quality_score desc, published_at desc`. | User-visible. 708 videos now showing. |
| **F** | Pro attribution on video cards: channel name becomes a link to the pro's `website_url`, "★ Featured" pill on featured videos, "Pro" badge on PGA-certified or featured pros. | ✅ |
| **G** | `/admin/starter` — admin-only queue of below-threshold videos with Approve / Hide / Feature / Rebucket actions. Backed by `/api/admin/starter-queue` + `/api/admin/video-action`. | 59 starter videos currently in the queue. |
| **G+** | `/admin/featured` — admin-only curator for all approved videos. Filter by bucket, search by title, toggle ★ feature, hide, rebucket. Backed by `/api/admin/approved-list`. | Easier than SQL for ongoing curation. |

### Extras built on top of the plan

- **Admin email gate.** Both admin pages check `session.user.email === ADMIN_EMAIL` client-side; the API routes re-validate the JWT server-side before any DB write. Everyone else gets bounced to `/clubhouse`.
- **Service role key on all server routes that touch videos/video_metadata.** RLS on `videos` blocks the anon key from selects, so every route reads/writes via `SUPABASE_SERVICE_ROLE_KEY`. That env var lives in Vercel and never ships to the browser.
- **`supabase/featured_pins.sql`** — a paste-in template for bulk-featuring by `youtube_video_id` when clicking through the curator feels slow.
- **`supabase/006_editorial_status_check.sql`** — adds a CHECK constraint on `editorial_status` so only `approved`/`starter`/`hidden` can be stored. Not yet run; pre-flight query included.
- **`supabase/cleanup_false_positive_buckets.sql`** — diagnostics + UPDATE templates for the ~4 rows the scorer mis-bucketed (mostly "fundaMENTALs" → course_management).

### Known follow-ups (low urgency)

- Run `supabase/006_editorial_status_check.sql` after confirming the pre-flight query only returns the three allowed values.
- Sweep `supabase/cleanup_false_positive_buckets.sql` to fix any remaining mis-bucketings.
- Fill in missing `bio` / `headshot_url` on the 16 pros where Claude returned nulls.
- Decide whether to add a CHECK constraint on `primary_bucket` at the DB level (migration 005 already has one; worth verifying it made it into production).
- Consider a soft-delete pattern for `editorial_status = 'hidden'` so accidentally-hidden videos are recoverable from the curator UI.


