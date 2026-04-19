-- ───────────────────────────────────────────────────────────────────
-- Phase 2: Leaves of Focus
--   focus_leaves    : user-defined focus areas (e.g. Putting, Driver)
--   leaf_items      : which saved items live in each leaf, and in what
--                     order. An item can live in multiple leaves.
-- ───────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── focus_leaves ──────────────────────────────────────────────────
create table if not exists public.focus_leaves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists focus_leaves_user_pos_idx
  on public.focus_leaves(user_id, position);

alter table public.focus_leaves enable row level security;

drop policy if exists "focus_leaves_select_own" on public.focus_leaves;
create policy "focus_leaves_select_own"
  on public.focus_leaves for select
  using ((select auth.uid()) = user_id);

drop policy if exists "focus_leaves_insert_own" on public.focus_leaves;
create policy "focus_leaves_insert_own"
  on public.focus_leaves for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "focus_leaves_update_own" on public.focus_leaves;
create policy "focus_leaves_update_own"
  on public.focus_leaves for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "focus_leaves_delete_own" on public.focus_leaves;
create policy "focus_leaves_delete_own"
  on public.focus_leaves for delete
  using ((select auth.uid()) = user_id);

-- ─── leaf_items ────────────────────────────────────────────────────
-- item_type: 'video' | 'article' | 'answer'
-- item_id:   the referenced row's id (text for mixed id-types: videos/articles use uuid,
--            saved_answers.id is uuid too, so text is a safe lowest common denominator)
create table if not exists public.leaf_items (
  id          uuid primary key default gen_random_uuid(),
  leaf_id     uuid not null references public.focus_leaves(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_type   text not null check (item_type in ('video','article','answer')),
  item_id     text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (leaf_id, item_type, item_id)
);

create index if not exists leaf_items_leaf_pos_idx
  on public.leaf_items(leaf_id, position);

create index if not exists leaf_items_user_idx
  on public.leaf_items(user_id);

alter table public.leaf_items enable row level security;

drop policy if exists "leaf_items_select_own" on public.leaf_items;
create policy "leaf_items_select_own"
  on public.leaf_items for select
  using ((select auth.uid()) = user_id);

drop policy if exists "leaf_items_insert_own" on public.leaf_items;
create policy "leaf_items_insert_own"
  on public.leaf_items for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaf_items_update_own" on public.leaf_items;
create policy "leaf_items_update_own"
  on public.leaf_items for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaf_items_delete_own" on public.leaf_items;
create policy "leaf_items_delete_own"
  on public.leaf_items for delete
  using ((select auth.uid()) = user_id);

-- ─── backfill: one "Unsorted" leaf per user who has saved anything,
--              and every existing saved item goes into it ──────────
do $$
declare
  r record;
  v_leaf_id uuid;
begin
  for r in
    select distinct user_id
    from (
      select user_id from public.saved_videos
      union
      select user_id from public.saved_articles
      union
      select user_id from public.saved_answers
    ) u
  loop
    -- Create the Unsorted leaf if it doesn't already exist
    select id into v_leaf_id
    from public.focus_leaves
    where user_id = r.user_id and name = 'Unsorted'
    limit 1;

    if v_leaf_id is null then
      insert into public.focus_leaves (user_id, name, position)
      values (r.user_id, 'Unsorted', 0)
      returning id into v_leaf_id;
    end if;

    -- Videos
    insert into public.leaf_items (leaf_id, user_id, item_type, item_id, position)
    select v_leaf_id, sv.user_id, 'video', sv.video_id::text,
           row_number() over (order by sv.created_at) - 1
    from public.saved_videos sv
    where sv.user_id = r.user_id
    on conflict (leaf_id, item_type, item_id) do nothing;

    -- Articles
    insert into public.leaf_items (leaf_id, user_id, item_type, item_id, position)
    select v_leaf_id, sa.user_id, 'article', sa.article_id::text,
           row_number() over (order by sa.created_at) - 1
             + (select count(*) from public.saved_videos where user_id = r.user_id)
    from public.saved_articles sa
    where sa.user_id = r.user_id
    on conflict (leaf_id, item_type, item_id) do nothing;

    -- Answers
    insert into public.leaf_items (leaf_id, user_id, item_type, item_id, position)
    select v_leaf_id, san.user_id, 'answer', san.id::text,
           row_number() over (order by san.created_at) - 1
             + (select count(*) from public.saved_videos where user_id = r.user_id)
             + (select count(*) from public.saved_articles where user_id = r.user_id)
    from public.saved_answers san
    where san.user_id = r.user_id
    on conflict (leaf_id, item_type, item_id) do nothing;
  end loop;
end $$;

-- ─── verify ────────────────────────────────────────────────────────
select 'focus_leaves' as table_name, count(*) as rows from public.focus_leaves
union all
select 'leaf_items',             count(*)            from public.leaf_items;
