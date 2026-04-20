-- ============================================================
-- Lock editorial_status to a known set of values.
--
-- Before running: confirm the existing rows only use the three
-- values we're about to allow. Migration 005 set up the column
-- with a default but no CHECK constraint.
-- ============================================================

-- 1. Pre-flight: any rogue values?
SELECT editorial_status, count(*)
FROM videos
GROUP BY editorial_status
ORDER BY editorial_status;

-- Expected: only 'approved', 'starter', and (possibly) 'hidden'.
-- If anything else shows up, clean it first before running the ALTER.


-- 2. Add the CHECK constraint.
ALTER TABLE videos
  ADD CONSTRAINT videos_editorial_status_check
  CHECK (editorial_status IN ('approved', 'starter', 'hidden'));


-- Rollback (if needed):
-- ALTER TABLE videos DROP CONSTRAINT videos_editorial_status_check;
