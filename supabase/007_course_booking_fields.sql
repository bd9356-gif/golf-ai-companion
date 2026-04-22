-- 007_course_booking_fields.sql
-- Adds booking-window metadata to saved_courses so Home Courses can remind
-- the user when tee times open (especially useful for Florida in-season
-- midnight drops).
--
-- Run this once in the Supabase SQL editor. Safe to re-run — all three
-- columns use IF NOT EXISTS.

alter table saved_courses
  add column if not exists booking_window_days integer;

alter table saved_courses
  add column if not exists booking_opens_time text;   -- "HH:mm" 24h

alter table saved_courses
  add column if not exists booking_notes text;

-- Sanity check: booking_window_days must be >= 0 when provided.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'saved_courses'
      and constraint_name = 'saved_courses_booking_window_days_nonneg'
  ) then
    alter table saved_courses
      add constraint saved_courses_booking_window_days_nonneg
      check (booking_window_days is null or booking_window_days >= 0);
  end if;
end $$;
