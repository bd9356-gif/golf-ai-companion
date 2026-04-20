-- Add a position column to cart_items so users can drag-reorder their plan.
-- Backfills positions per-user from created_at desc so the current ordering
-- (newest first) is preserved for existing rows.
--
-- Run once in the Supabase SQL editor.

alter table cart_items
  add column if not exists position int not null default 0;

with ordered as (
  select
    id,
    (row_number() over (partition by user_id order by created_at desc) - 1)::int as pos
  from cart_items
)
update cart_items c
set position = o.pos
from ordered o
where c.id = o.id;

create index if not exists cart_items_user_position_idx
  on cart_items (user_id, position);
