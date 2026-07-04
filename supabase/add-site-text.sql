-- Editable site text for Ministry Task Group (safe to run repeatedly)

create table if not exists settings (
  key text primary key,
  value text not null default ''
);

alter table settings enable row level security;
drop policy if exists "public read settings" on settings;
drop policy if exists "open write settings" on settings;
create policy "public read settings" on settings for select using (true);
create policy "open write settings" on settings for all using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table settings;
exception when duplicate_object then null; end $$;

insert into settings (key, value) values
  ('app_title', 'Ministry Task Group'),
  ('org_name', 'First United Methodist Church · Ridgecrest'),
  ('hero_text', 'This week at First UMC — ways to gather, serve, and belong.')
on conflict (key) do nothing;
