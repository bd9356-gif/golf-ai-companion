-- ============================================================
-- Cleanup pass — find and fix false-positive bucket assignments.
--
-- Earlier diagnostics found ~4 mis-bucketings where the scorer
-- confused a title containing "fundaMENTALs" / "funDAMENTAL" with
-- mental-game content and routed the video to course_management.
--
-- Run block by block in the Supabase SQL editor.
-- ============================================================

-- 1. Candidate false positives — course_management rows whose titles
--    sound like swing fundamentals rather than strategy/mental game.
SELECT
  v.id,
  v.title,
  v.channel_name,
  v.primary_bucket,
  vm.quality_score,
  vm.quality_reason
FROM videos v
LEFT JOIN video_metadata vm ON vm.video_id = v.id
WHERE v.primary_bucket = 'course_management'
  AND (
    v.title ILIKE '%fundamental%'
    OR v.title ILIKE '%fundaMENTAL%'
    OR v.title ILIKE '%basics%'
    OR v.title ILIKE '%grip%'
    OR v.title ILIKE '%stance%'
    OR v.title ILIKE '%posture%'
    OR v.title ILIKE '%swing basics%'
  )
ORDER BY v.title;


-- 2. Also sanity-check every bucket against its title — quick regex
--    mismatch scan. Review any rows where the title clearly
--    contradicts the bucket.
SELECT
  v.primary_bucket,
  v.title,
  v.channel_name
FROM videos v
WHERE v.editorial_status = 'approved'
  AND (
    (v.primary_bucket = 'putting'  AND v.title NOT ILIKE '%putt%' AND v.title NOT ILIKE '%green%' AND v.title NOT ILIKE '%read%')
    OR (v.primary_bucket = 'short_game' AND v.title NOT ILIKE '%chip%' AND v.title NOT ILIKE '%pitch%' AND v.title NOT ILIKE '%bunker%' AND v.title NOT ILIKE '%wedge%' AND v.title NOT ILIKE '%short game%' AND v.title NOT ILIKE '%flop%' AND v.title NOT ILIKE '%lob%')
  )
ORDER BY v.primary_bucket, v.title
LIMIT 50;


-- 3. Fix a specific row by ID. Copy an id from block 1 or 2 and set
--    the correct bucket. Safe to run repeatedly.
-- UPDATE videos
-- SET primary_bucket = 'full_swing'
-- WHERE id = '<paste id here>';


-- 4. Bulk fix by title pattern — use carefully, and only after
--    reviewing block (1) output first. Example: move anything with
--    "fundamentals" in the title out of course_management and back
--    to full_swing.
-- UPDATE videos
-- SET primary_bucket = 'full_swing'
-- WHERE primary_bucket = 'course_management'
--   AND title ILIKE '%fundamental%';


-- 5. Post-fix sanity check — bucket distribution, should roughly
--    match the earlier 566 / 151 / 27 / 23 split.
SELECT primary_bucket, count(*) AS n
FROM videos
WHERE editorial_status = 'approved'
GROUP BY primary_bucket
ORDER BY n DESC;
