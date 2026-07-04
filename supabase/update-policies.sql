-- Write-access policies for Ministry Task Group (safe to run repeatedly)

drop policy if exists "admin write teams" on teams;
drop policy if exists "admin write people" on people;
drop policy if exists "admin write events" on events;
drop policy if exists "admin write announcements" on announcements;
drop policy if exists "admin write activity" on activity;

drop policy if exists "open write teams" on teams;
drop policy if exists "open write people" on people;
drop policy if exists "open write events" on events;
drop policy if exists "open write announcements" on announcements;
drop policy if exists "open write activity" on activity;

create policy "open write teams" on teams for all using (true) with check (true);
create policy "open write people" on people for all using (true) with check (true);
create policy "open write events" on events for all using (true) with check (true);
create policy "open write announcements" on announcements for all using (true) with check (true);
create policy "open write activity" on activity for all using (true) with check (true);
