<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MyGolf Companion — Project Brief

A **cozy, modern golf companion** that blends an instructional video library, AI-crafted guides, a personal "golf bag" of saves, and an AI club pro. For **home golfers** who want a simple, confidence-building way to learn, plan, and play better.

Repo: `bd9356-gif/golf-ai-companion`
Supabase project: `oxipafpvpepfyvwielwy.supabase.co` (separate from the Recipe site's Supabase).
Deploy target: Vercel. Production URL lives on Vercel (not yet on a custom `mycompanionapps.com` subdomain — open question).
Mobile-first (`max-w-4xl` content, compact headers throughout).

## Stack

- **Next.js 16** (App Router). The block above is real — APIs have drifted; check `node_modules/next/dist/docs/` before writing anything novel.
- **React 19**
- **Tailwind CSS v4** — class strings must be written out in full (no dynamic concatenation) so v4's JIT scanner can pick them up.
- **Supabase** (auth + Postgres). Client in `lib/supabase.js`, also instantiated inline at the top of most pages.
- **Anthropic SDK** (`@anthropic-ai/sdk`) — used by API routes. Current model: `claude-haiku-4-5-20251001` for most things, `claude-sonnet-4-6` for the Ask Companion chat.
- **@dnd-kit** — used on MyBag for drag-to-reorder inside skills and inside My Plan.
- **ESLint 9** / `eslint-config-next`.

## Brand & Naming

Brand voice is **cozy, modern, confidence-building**. User is the home golfer who wants a simple personal place to save lessons, guides, and AI answers.

Canonical names — use them exactly:

| Name              | Route            | What it is                                                     |
| ----------------- | ---------------- | -------------------------------------------------------------- |
| MyClubhouse       | `/clubhouse`     | The hub. Everything routes from here. Daily course-photo hero. |
| Golf TV           | `/golf-tv`       | Instructional video library (YouTube-backed).                  |
| My Golf Bag       | `/bag`           | Personal saves organized into five fixed skill buckets.        |
| My Courses        | `/home-courses`  | Saved courses (notes, phone, tee-time link). Route stays `/home-courses` for bookmark preservation. |
| Playbook          | `/guides`        | AI-crafted articles grouped by topic. Route stays `/guides`.   |
| Club Pro          | `/club-pro`      | AI chat for personal guidance. Inside-app CTA buttons may still read "Ask the Club Pro" as an action verb. |

Other routes: `/login`, `/profile`, `/about`, `/auth/callback`, `/auth/confirm`, `/admin/starter`, `/admin/featured`.

The brand line in the header is **MyGolf Companion** with tagline "Your AI guide to better golf".

Header pattern across all pages: `← Clubhouse` (left) / emoji + title + tiny green subtitle (middle) / `🏌️` MyBag link (right). Club Pro's middle icon is `🎓`; Clubhouse's is `⛳` with `👤` Profile on the right.

## Clubhouse tiles (`/clubhouse`)

The hub splits tiles into two labeled sections: **Your Golf Journey** (personal saves + your home courses) and **The Pro Shop** (AI-powered tools framed as staff you consult). Every tile uses the same unified style — thin gray ring with a thick green left stripe — so the whole page reads as one app, not a rainbow of per-section colors. Green is the brand color throughout.

Tile anatomy: icon + title + short one-line description + a right-side → arrow. No dash subtitles — the description is the subtitle.

**Your Golf Journey**

| Tile         | Description                        |
| ------------ | ---------------------------------- |
| Golf TV      | Every lesson, one tap away.        |
| My Golf Bag  | Save, sort, and build your game.   |
| My Courses   | Notes, tips, tee times.            |

**The Pro Shop** (AI tools — the label is "The Pro Shop", not "AI ProShop"; we want the metaphor to do the work, not the acronym)

| Tile         | Description                        |
| ------------ | ---------------------------------- |
| Playbook     | Read smarter. Play better.         |
| Club Pro     | Ask anything. Get clear answers.   |

The page is sized to fit an iPhone viewport without scrolling. Descriptions are `truncate`d so any future rewording can't break the fit. Hero height is responsive: `h-28 sm:h-40 md:h-52`. Greeting line uses `getGreeting()` for a time-of-day line ("Good morning, golfer").

## MyBag — five fixed skill buckets (`/bag`)

MyBag is locked to five ordered buckets (no rename, no delete, no reorder). The DB name "Holding Bucket" is kept for back-compat; the user-facing label is "The Starter".

| DB name            | Label              | Icon | Color  |
| ------------------ | ------------------ | ---- | ------ |
| Holding Bucket     | The Starter        | 📥   | yellow |
| Full Swing         | Full Swing         | 🏌️   | green  |
| Short Game         | Short Game         | 🪓   | orange |
| Putting            | Putting            | ⛳   | sky    |
| Course Management  | Course Management  | 🗺️   | purple |

Per-skill color is applied to the outer border, header background, title text, count pill, and a soft body tint when open. Classes are written out as complete strings (no dynamic concat) because of Tailwind v4's JIT.

### MyBag behavior notes

- **The Starter callout.** Above the bucket list, a prominent yellow card with 📥 says "New saves wait at The Starter until you move them into a skill." A matching green callout with 💡 at the bottom explains Move ▾ and the ⋮⋮ drag handle.
- **Clickable headers.** Each bucket header is a single full-width button. The expand chevron sits on the right edge for thumb reach.
- **All buckets start collapsed** on page open — user expands what they want.
- **My Plan (🛺).** The cart lives at the top of the header. Clicking it toggles the Plan panel AND smooth-scrolls to the top of the page. Adding an item to the plan does **not** auto-open the panel (that was causing a mid-page scroll jump); the `cartCount` badge is the feedback. See `toggleCartPanel()` and `addToCart()` in `app/bag/page.js`.
- **Plan items start collapsed** (scannable list). User taps ▼ to open any item inline.
- **Practice mode.** A focus overlay walks through plan items one at a time, keyboard-arrow and ESC friendly.
- **Deletes cascade through leaves.** `removeSavedVideo/Article/Answer` also delete the matching `leaf_items` rows and any `cart_items` row — the bag stays consistent across surfaces.

## Playbook topic colors (`/guides`)

Topics are grouped into collapsed sections. Each group has a color stripe matching MyBag where the skills overlap:

| Topic             | Color  |
| ----------------- | ------ |
| swing             | green  |
| course management | purple |
| mental game       | indigo |
| fitness           | rose   |
| putting           | sky    |
| short game        | orange |

Group header is `border-2` with a colored bg; body is a soft tint. All sections default to collapsed on load.

## Golf TV behavior (`/golf-tv`)

- **Sticky filter bar** below the page header. Search input + five category chips (All, Full Swing, Short Game, Putting, Course Mgmt) sit in a sticky container at `top-[57px]` (below the page header).
- **Chips use shortened labels + emoji** to fit on a phone. Order is locked.
- **Sort order:** `is_featured` first → `quality_score` desc → `published_at` desc.
- **Editorial gate.** Only `editorial_status = 'approved'` shows on the public list. Admins can flip videos between `approved`, `starter`, and `hidden` via `/admin/starter` (queue below auto-approve threshold) and `/admin/featured` (curator list).
- **Pre-2019 videos are hidden.** A one-off SQL pass moved ~76 vintage lessons (2010–2016) to `editorial_status = 'hidden'` so Golf TV feels current.

## Supabase schema (inferred — verify before migrations)

Tables referenced in the app:

- **`videos`** — canonical video row. Cols include `id, title, url, thumbnail_url, youtube_video_id, channel_name, description, published_at, primary_bucket, is_featured, editorial_status, pro_id`.
  - `editorial_status` is constrained to `('approved','starter','hidden')` via CHECK in `supabase/006_editorial_status_check.sql`.
  - `primary_bucket` is one of the four canonical skills (`full_swing`, `short_game`, `putting`, `course_management`).
- **`video_metadata`** — `video_id (fk), skill_tiers, topics, ai_summary, quality_score, quality_reason, ingredients (legacy)`.
- **`pros`** — `id, slug, display_name, website_url, is_featured, pga_certified, status`.
- **`articles`** — guide rows: `id, title, summary, content, topic, read_time_minutes, created_at`.
- **`focus_leaves`** — `id, user_id, name, position` — the five MyBag skills per user (seeded by `ensureFixedBuckets` on first bag visit).
- **`leaf_items`** — `id, user_id, leaf_id, item_type ('video'|'article'|'answer'), item_id, position` — which items live in which skill.
- **`saved_videos`** — `user_id, video_id` (join to `videos`).
- **`saved_articles`** — `user_id, article_id` (join to `articles`).
- **`saved_answers`** — `id, user_id, question, answer, created_at, skill_level`.
- **`cart_items`** — `id, user_id, item_id, item_type, item_title, position, created_at` — the 🛺 My Plan list.
- **`home_courses`** — `id, user_id, name, notes, phone, tee_time_url, created_at`.

RLS: the app runs on the anon key, so every table is expected to have RLS policies scoped to `user_id = auth.uid()` for authenticated reads/writes.

## API routes (`app/api/`)

- `/api/ask-companion` — Ask the Club Pro backend (uses `claude-sonnet-4-6`).
- `/api/fetch-videos` — pulls new videos from YouTube, auto-stamps `pro_id` when the channel matches a row in `pros`. Returns `{ success, message, totalInserted }`; note that `totalInserted` increments on both inserts AND updates so it can overstate the delta.
- `/api/score-videos` — scores unscored/unbucketed videos via Claude; writes `quality_score`, `quality_reason`, `topics`, and sets `primary_bucket`. Force-dynamic; uses the service role key.
- `/api/generate-article` — drafts a new Guide article with Claude.
- `/api/seed-pros` — one-time idempotent seeder that writes a curated list of pros into the `pros` table and backfills `pro_id` on existing videos.
- `/api/backfill-descriptions` — fills in missing `description` text on video rows.
- `/api/admin/starter-queue` (GET) — videos with `editorial_status = 'starter'` plus metadata, for the admin review queue.
- `/api/admin/approved-list` (GET) — approved videos with filters (bucket, featured-only, title query); used by the Featured curator.
- `/api/admin/video-action` (POST) — actions: `approve`, `hide`, `starter`, `feature`, `unfeature`, `rebucket`, `set_status`. Admin auth via Bearer token; validates email against `ADMIN_EMAIL`.

## Admin pages (`app/admin/`)

- `/admin/starter` — review queue for below-threshold videos. Auto-approve runs at `quality_score ≥ 7`; anything below lands in starter for manual review. Per-video actions: ✓ Approve, ★ Feature, 🗑 Hide, bucket dropdown.
- `/admin/featured` — curator for the approved list. Tabs for All/Full Swing/Short Game/Putting/Course Mgmt, debounced title search (300ms), featured-only filter, amber ring on featured rows.

Both pages gate on `session.user.email === ADMIN_EMAIL` client-side; the API routes also require a valid Bearer token.

## Ingestion scripts

Legacy manual-run scripts live in the repo root / historical paths. Current preferred path is the API routes above (they run on Vercel and use the service role key from env). When running locally against production, use `SUPABASE_SERVICE_ROLE_KEY` — never commit it.

## Authentication

Two ways to sign in, both on `/login` (mirrors the Recipe site — no password, no separate signup page):

- **Email magic-link** — `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '<origin>/auth/callback' } })`. Primary button ("Email me a sign-in link"). After submit the form swaps to a "📬 Check your email" confirmation panel with a "Use a different email" escape hatch.
- **Continue with Google** — `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })`.

Both flows land on `app/auth/callback/` → `app/auth/confirm/` → `/clubhouse`. First-time magic-link sign-in creates the account automatically, so there's no `/signup` route and no password field anywhere.

### SMTP for magic-link deliverability (Resend)

Supabase's default SMTP is rate-limited and gets spam-flagged by Hotmail/Outlook. This project uses the same Resend setup already wired up on the Recipe site — same Resend account, same verified domain `mycompanionapps.com`, just pointed at this Supabase project.

The magic-link email (and any future password-reset / admin invite emails) goes through this SMTP.

- **Provider:** Resend — domain `mycompanionapps.com` already verified (SPF/DKIM/DMARC live on the domain DNS).
- **Supabase → this project → Authentication → SMTP Settings:** host `smtp.resend.com`, port `465`, username `resend`, password = Resend API key. Sender `noreply@mycompanionapps.com`, display name **MyGolf Companion** (so recipients can tell it apart from the Recipe site).
- **Supabase → Authentication → URL Configuration:** Site URL = the Vercel production URL. Redirect allow-list includes `<prod>/auth/callback` and `http://localhost:3000/auth/callback` for local dev.
- **Supabase → Authentication → Providers → Email:** enabled. Google OAuth is configured under Providers separately.

**Finding the SMTP setting in the Supabase dashboard.** Supabase keeps moving this around and it's annoying every time. If it's not where you expect, try (in order): **Authentication → Emails** (SMTP often lives below the template editor), **Authentication → Settings** (scroll for "SMTP Settings" / "Custom SMTP"), or **Project Settings → Authentication** (the old home). Fastest: hit `Cmd/Ctrl+K` in the dashboard and search **"SMTP"** — the command palette jumps straight to it. The toggle is "Enable Custom SMTP"; fields appear below once it's on.

Rotating / revoking the Resend API key is a Supabase SMTP-fields update only; no app-code change.

**Status (April 2026):** SMTP is configured on this project and pointed at Resend. Testing with a Hotmail address to confirm deliverability (Hotmail was the original reason this exists — default Supabase SMTP was landing in its spam folder).

If/when the Golf site moves onto its own subdomain (e.g. `golf.mycompanionapps.com`), update Site URL and the redirect allow-list, and that's it — sender stays on `mycompanionapps.com`.

## Environment & secrets

`.env.local` holds:

- `NEXT_PUBLIC_SUPABASE_URL=https://oxipafpvpepfyvwielwy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=…` (publishable key)
- `SUPABASE_SERVICE_ROLE_KEY=…` (server-only, for admin routes + score-videos)
- `ANTHROPIC_API_KEY=…`
- `YOUTUBE_API_KEY=…` (used by `/api/fetch-videos`)
- `ADMIN_EMAIL=bd9356@gmail.com`

Never commit `.env.local`. Service role key is ONLY for server routes that need it (admin, score-videos) and is gated behind the admin-email check on the admin routes.

## Workflow

- `npm run dev` — local at `http://localhost:3000`.
- **Temp clone pattern for commits.** The working tree at `/sessions/epic-upbeat-ritchie/mnt/golf-ai-companion/` is NOT where commits happen. Commits go through `/tmp/golf-ai-clone/`:
  1. Make edits in the mnt working tree.
  2. `cp` changed files over to `/tmp/golf-ai-clone/` at the same relative paths.
  3. `cd /tmp/golf-ai-clone && git add <files> && git commit -m "…" && git push origin main`.
  4. `git log` in mnt will look stale — that's expected.
- Commit style: `feat: <page> - <short summary>` with a bullet list in the body for specifics. Example: `feat: Clubhouse - short punchy tile taglines`.
- Pushing to `main` triggers a Vercel deploy automatically.

## Known pre-existing issues

- `git status` in the mnt working tree shows lots of "modified" files that were actually committed via the temp clone — the mnt tree is just out of sync. Don't try to "fix" it by reverting; the history in `/tmp/golf-ai-clone` is the truth.
- The GitHub PAT is currently embedded in the `origin` remote URL of `/tmp/golf-ai-clone/.git/config`. Rotate at https://github.com/settings/tokens and reset the remote to SSH or a credential helper when convenient.
- `app/api/fetch-videos`: `totalInserted` counts both inserts and updates; the real "new rows" delta is `SELECT count(*) FROM videos` before vs after.

## Decision log

- **Pre-2019 videos are hidden from Golf TV.** Vintage 2010–2016 lessons were outranking newer videos due to sort-by-quality. One-off UPDATE moved 76 rows to `editorial_status = 'hidden'`. If we want them back, flip back to `approved`.
- **MyBag buckets are fixed and locked.** No rename/reorder/delete. The five are canonical. Adding a sixth skill requires a schema + UI change.
- **Add-to-cart does not auto-open the Plan panel** (April 2026). Caused a mid-page scroll jump; the count badge on the 🛺 button is feedback enough.
- **Clubhouse tile descriptions are `truncate`d.** Prevents future copy edits from breaking the iPhone-fit layout.

## How to use this file

- Every session starts fresh with no memory. This file is the handoff.
- When adding a page, section, table, or convention — update the relevant section here in the same commit.
- Decisions worth remembering ("we tried X and rejected it because Y") go in **Decision log** rather than commit messages.
