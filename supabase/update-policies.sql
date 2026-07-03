-- Run this once in Supabase → SQL Editor.
-- It lets the app save admin changes without a login,
-- to match the static admin code in the app.

drop policy if exists "admin write teams" on teams;
drop policy if exists "admin write people" on people;
drop policy if exists "admin write events" on events;
drop policy if exists "admin write announcements" on announcements;
drop policy if exists "admin write activity" on activity;

create policy "open write teams" on teams for all using (true) with check (true);
create policy "open write people" on people for all using (true) with check (true);
create policy "open write events" on events for all using (true) with check (true);
create policy "open write announcements" on announcements for all using (true) with check (true);
create policy "open write activity" on activity for all using (true) with check (true);
