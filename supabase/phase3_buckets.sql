-- Phase 3: Fixed 5-bucket structure for Your Golf Bag
-- Ensures every user has exactly these 5 buckets, in this locked order:
--   0. Holding Bucket   (inbox for new saves)
--   1. Full Swing
--   2. Short Game
--   3. Putting
--   4. Course Management
--
-- Migration steps per user:
--   1. Rename any existing 'Unsorted' leaf to 'Holding Bucket' (Phase 2 legacy).
--   2. Ensure all 5 fixed buckets exist; create missing ones with correct positions.
--   3. Re-snap positions on existing fixed buckets (Holding=0, Full Swing=1, ...).
--   4. Move items from any custom (non-fixed) leaves into Holding Bucket.
--   5. Delete the custom leaves (leaf_items cascade via FK).

do $$
declare
  v_user uuid;
  v_holding_id uuid;
  v_leaf record;
  v_max_pos integer;
begin
  -- Iterate over every user that has at least one leaf OR any saved item
  for v_user in
    select user_id from (
      select user_id from public.focus_leaves
      union
      select user_id from public.saved_videos
      union
      select user_id from public.saved_articles
      union
      select user_id from public.saved_answers
    ) u
  loop
    -- Step 1: Rename legacy 'Unsorted' leaf → 'Holding Bucket'.
    -- If the user somehow has both (shouldn't, but defensive), rename 'Unsorted' with a temp
    -- name so the unique-by-user-name convention isn't violated, then merge below.
    update public.focus_leaves
      set name = 'Holding Bucket'
      where user_id = v_user
        and name = 'Unsorted'
        and not exists (
          select 1 from public.focus_leaves f2
          where f2.user_id = v_user and f2.name = 'Holding Bucket'
        );

    -- Step 2: Ensure each fixed bucket exists.
    insert into public.focus_leaves (user_id, name, position)
      select v_user, b.name, b.position
      from (values
        ('Holding Bucket', 0),
        ('Full Swing', 1),
        ('Short Game', 2),
        ('Putting', 3),
        ('Course Management', 4)
      ) as b(name, position)
      where not exists (
        select 1 from public.focus_leaves f
        where f.user_id = v_user and f.name = b.name
      );

    -- Step 3: Re-snap positions on the fixed buckets (locked order).
    update public.focus_leaves set position = 0 where user_id = v_user and name = 'Holding Bucket';
    update public.focus_leaves set position = 1 where user_id = v_user and name = 'Full Swing';
    update public.focus_leaves set position = 2 where user_id = v_user and name = 'Short Game';
    update public.focus_leaves set position = 3 where user_id = v_user and name = 'Putting';
    update public.focus_leaves set position = 4 where user_id = v_user and name = 'Course Management';

    -- Step 4: Move items from any non-fixed (user-created custom) leaves into Holding Bucket.
    select id into v_holding_id
      from public.focus_leaves
      where user_id = v_user and name = 'Holding Bucket'
      limit 1;

    select coalesce(max(position), -1) into v_max_pos
      from public.leaf_items
      where leaf_id = v_holding_id;

    for v_leaf in
      select id from public.focus_leaves
        where user_id = v_user
          and name not in ('Holding Bucket', 'Full Swing', 'Short Game', 'Putting', 'Course Management')
    loop
      -- Re-key items into Holding with preserved order.
      insert into public.leaf_items (leaf_id, user_id, item_type, item_id, position)
      select
        v_holding_id,
        li.user_id,
        li.item_type,
        li.item_id,
        v_max_pos + row_number() over (order by li.position)
      from public.leaf_items li
      where li.leaf_id = v_leaf.id
      on conflict (leaf_id, item_type, item_id) do nothing;

      -- Bump v_max_pos for next custom leaf's items
      select coalesce(max(position), -1) into v_max_pos
        from public.leaf_items
        where leaf_id = v_holding_id;

      -- Step 5: drop the custom leaf (cascades to its leaf_items rows).
      delete from public.focus_leaves where id = v_leaf.id;
    end loop;
  end loop;
end $$;

-- Verify
select user_id, name, position
  from public.focus_leaves
  order by user_id, position;
