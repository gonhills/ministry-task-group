-- ============================================================
-- Ministry Task Group — Inventory + Lead Hub upgrade
-- Run this whole file once in: Supabase Dashboard → SQL Editor
-- (Safe to run more than once.)
-- ============================================================

-- Church-wide inventory / supplies
create table if not exists inventory (
  id text primary key,
  item text not null default '',
  category text not null default 'General',
  have integer not null default 0,
  need integer not null default 0,
  unit text not null default '',
  location text not null default '',
  notes text not null default '',
  team_id text,
  created_at timestamptz not null default now()
);

-- Task tracker for group leads
create table if not exists lead_tasks (
  id text primary key,
  title text not null default '',
  details text not null default '',
  assignee text not null default '',
  team_id text,
  due text not null default '',
  status text not null default 'todo', -- todo | doing | done
  created_at timestamptz not null default now()
);

-- Message board for lead communication
create table if not exists messages (
  id text primary key,
  author text not null default '',
  body text not null default '',
  team_id text,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security (matches the rest of the app) ----------

alter table inventory enable row level security;
alter table lead_tasks enable row level security;
alter table messages enable row level security;

drop policy if exists "public read inventory" on inventory;
drop policy if exists "open write inventory" on inventory;
create policy "public read inventory" on inventory for select using (true);
create policy "open write inventory" on inventory for all using (true) with check (true);

drop policy if exists "public read lead_tasks" on lead_tasks;
drop policy if exists "open write lead_tasks" on lead_tasks;
create policy "public read lead_tasks" on lead_tasks for select using (true);
create policy "open write lead_tasks" on lead_tasks for all using (true) with check (true);

drop policy if exists "public read messages" on messages;
drop policy if exists "open write messages" on messages;
create policy "public read messages" on messages for select using (true);
create policy "open write messages" on messages for all using (true) with check (true);

-- ---------- Realtime ----------

do $$ begin
  alter publication supabase_realtime add table inventory;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table lead_tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;
