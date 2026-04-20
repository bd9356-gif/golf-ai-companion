-- Phase A — Pro attribution + bucket taxonomy + editorial gating
--
-- Additive migration. Existing app code keeps working because every new
-- column has a default (or is nullable). Run once in the Supabase SQL editor.
--
-- Summary:
--   1. New `pros` table — authoritative pro records with headshot, website,
--      booking link, featured + PGA-certified flags. Videos reference it via
--      videos.pro_id (nullable; backfilled by channel name/id).
--   2. New columns on `videos`:
--        - pro_id            fk to pros (nullable)
--        - primary_bucket    one of four canonical buckets
--        - is_featured       editorial pin
--        - editorial_status  starter | approved | hidden (global inbox)
--   3. New columns on `video_metadata`:
--        - sub_tags          fine-grained tags inside a bucket
--        - quality_reason    one-line Claude justification
--
-- See docs/video-schema-review.md for the full rationale.

-- ------------------------------------------------------------
-- 1. pros
-- ------------------------------------------------------------

create table if not exists pros (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- url-safe: 'rick-shiels', 'me-and-my-golf'
  display_name text not null,                   -- "Rick Shiels"
  headshot_url text,
  bio text,
  website_url text,                             -- primary external link (academy, personal site)
  booking_url text,                             -- optional "book a lesson" link
  youtube_channel_id text,                      -- for matching incoming videos
  youtube_channel_name text,                    -- denormalized for easy read
  pga_certified boolean not null default false, -- editorial verification
  is_featured boolean not null default false,   -- "editor's pick" pros
  status text not null default 'active'         -- 'active' | 'hidden' | 'pending'
    check (status in ('active','hidden','pending')),
  created_at timestamptz not null default now()
);

create index if not exists pros_slug_idx
  on pros (slug);

create index if not exists pros_youtube_channel_id_idx
  on pros (youtube_channel_id);

create index if not exists pros_youtube_channel_name_idx
  on pros (youtube_channel_name);

-- ------------------------------------------------------------
-- 2. videos — additive columns
-- ------------------------------------------------------------

alter table videos
  add column if not exists pro_id uuid references pros(id) on delete set null;

alter table videos
  add column if not exists primary_bucket text
    check (primary_bucket in ('full_swing','short_game','putting','course_management'));

alter table videos
  add column if not exists is_featured boolean not null default false;

-- editorial_status: 'starter' = ingested, unreviewed. 'approved' = shown to
-- users in Golf TV. 'hidden' = suppressed everywhere.
-- Default 'starter' so every new ingest lands in the Starter inbox; Claude
-- can promote to 'approved' automatically when quality_score >= 7.
alter table videos
  add column if not exists editorial_status text not null default 'starter'
    check (editorial_status in ('starter','approved','hidden'));

create index if not exists videos_primary_bucket_idx
  on videos (primary_bucket);

create index if not exists videos_editorial_status_idx
  on videos (editorial_status);

create index if not exists videos_pro_id_idx
  on videos (pro_id);

-- ------------------------------------------------------------
-- 3. video_metadata — additive columns
-- ------------------------------------------------------------

alter table video_metadata
  add column if not exists sub_tags text[] not null default '{}';

alter table video_metadata
  add column if not exists quality_reason text;

-- ------------------------------------------------------------
-- 4. Optional convenience view (read-only)
-- ------------------------------------------------------------

create or replace view video_with_pro as
select
  v.id,
  v.title,
  v.url,
  v.thumbnail_url,
  v.youtube_video_id,
  v.channel_name,
  v.description,
  v.published_at,
  v.primary_bucket,
  v.is_featured,
  v.editorial_status,
  v.pro_id,
  p.slug           as pro_slug,
  p.display_name   as pro_name,
  p.headshot_url   as pro_headshot_url,
  p.website_url    as pro_website_url,
  p.booking_url    as pro_booking_url,
  p.pga_certified  as pro_pga_certified,
  p.is_featured    as pro_is_featured,
  m.skill_tiers,
  m.topics,
  m.sub_tags,
  m.ai_summary,
  m.quality_score,
  m.quality_reason
from videos v
left join pros p on p.id = v.pro_id
left join video_metadata m on m.video_id = v.id;
