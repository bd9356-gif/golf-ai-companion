-- I Had a Five — The Buddy Edition (foundation, not yet wired up).
--
-- A per-user rule book that holds the home golfer's group's actual
-- playing rules — mulligans, gimme rules, money games, "I had a
-- five" scoring, the small etiquette rules that mattered, and rules
-- tied to friends no longer playing. Heritage feature in the same
-- spirit as Recipe Cards' Family Notes: the value compounds because
-- entries get added over years and tied to specific people.
--
-- Not yet wired up in the app. This migration is laid down so the
-- schema is ready when the UI is built. Run it whenever; the table
-- sitting empty has zero impact.
--
-- DATA SHAPE — each row is one buddy rule:
--   title           — short name ("Mulligan Mike's First-Tee Special")
--   rule_text       — what the rule actually says
--   story           — the backstory / memory (nullable)
--   in_memory_of    — name of someone who's no longer with the group
--                     (nullable; presence flips the row into a tribute
--                     visual on the eventual UI)
--   category        — loose grouping. Suggested values when we build:
--                       'tee'        — first-tee, mulligan, driving
--                       'green'      — putting, gimmes, "I had a five"
--                       'money'      — bets, presses, side games
--                       'etiquette'  — pace, silence, course care
--                       'memorial'   — rules specifically honoring a
--                                      lost friend (alongside in_memory_of)
--   photo_url       — optional photo (buddy portrait, scorecard pic)
--   sort_order      — user-defined manual ordering inside a category
--
-- WHEN BUILDING THE UI (future session):
--   - Cream paper background + Caveat handwriting font for entries
--     (same heritage typeface family as Recipe Cards' Family Notes)
--   - Rows marked `in_memory_of` get a small ribbon / muted color
--   - One-tap "Add a buddy rule" from anywhere; rules are short, the
--     friction should be near-zero
--   - Categories render as collapsed sections with counts, mirroring
--     the Library / Playbook accordion pattern Bill knows
--   - Optional: generate a printable PDF "Our Rules" book the group
--     can carry — same shape as the Shopping List print path on
--     Recipe (in-page print container, no popup window)
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS buddy_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  rule_text       text NOT NULL,
  story           text,
  in_memory_of    text,
  category        text,
  photo_url       text,
  sort_order      int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buddy_rules_user
  ON buddy_rules (user_id, category, sort_order, created_at);

-- RLS — every row scoped to the owner. Standard Golf-app pattern.
ALTER TABLE buddy_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners select own buddy_rules" ON buddy_rules;
CREATE POLICY "owners select own buddy_rules"
  ON buddy_rules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owners insert own buddy_rules" ON buddy_rules;
CREATE POLICY "owners insert own buddy_rules"
  ON buddy_rules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners update own buddy_rules" ON buddy_rules;
CREATE POLICY "owners update own buddy_rules"
  ON buddy_rules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners delete own buddy_rules" ON buddy_rules;
CREATE POLICY "owners delete own buddy_rules"
  ON buddy_rules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
