-- ============================================================
-- Featured pins — bulk mark videos as is_featured = true
--
-- Paste into Supabase SQL editor. Nothing here is run
-- automatically; run one block at a time.
-- ============================================================

-- 1. See what's currently featured (sanity check)
SELECT
  primary_bucket,
  count(*)        AS featured_count
FROM videos
WHERE is_featured = true
  AND editorial_status = 'approved'
GROUP BY primary_bucket
ORDER BY primary_bucket;


-- 2. Pick hero videos per bucket from the top of the quality list.
--    Review the titles, then grab the youtube_video_id's you want to
--    feature and paste them into block (3) below.

SELECT
  v.youtube_video_id,
  v.title,
  v.channel_name,
  v.primary_bucket,
  v.is_featured,
  vm.quality_score
FROM videos v
LEFT JOIN video_metadata vm ON vm.video_id = v.id
WHERE v.editorial_status = 'approved'
  AND v.primary_bucket = 'full_swing'     -- swap bucket here
ORDER BY vm.quality_score DESC NULLS LAST, v.published_at DESC
LIMIT 25;


-- 3. Bulk-feature a list of YouTube IDs.
--    Swap in the IDs from block (2). Safe to re-run — already-featured
--    rows just get re-set to true.

UPDATE videos
SET is_featured = true
WHERE youtube_video_id IN (
  -- 'dQw4w9WgXcQ',
  -- 'abc123xyz45',
  ''  -- keep at least one value so the list is never empty
);


-- 4. Undo — un-feature by YouTube ID.
--    Useful if you accidentally feature the wrong hero.

UPDATE videos
SET is_featured = false
WHERE youtube_video_id IN (
  ''
);


-- 5. Feature by pro — pin every approved video from one pro as featured.
--    (Use sparingly — if a pro has 30 videos they'll all light up.)

-- UPDATE videos
-- SET is_featured = true
-- WHERE pro_id = (SELECT id FROM pros WHERE slug = 'rick-shiels-golf')
--   AND editorial_status = 'approved';
