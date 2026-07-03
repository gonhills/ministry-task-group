-- ============================================================
-- Ministry Task Group — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- Tables ----------

create table if not exists teams (
  id text primary key,
  name text not null default '',
  color text not null default '#3D5A48',
  icon text not null default '✦',
  goal text not null default '',
  lead text not null default '',
  volunteers jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists people (
  id text primary key,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  team_id text references teams(id),
  title text not null default '',
  day text not null default 'Sunday',
  date text not null default '',
  time text not null default '',
  location text not null default '',
  status text not null default 'upcoming',
  goal text not null default '',
  instructions jsonb not null default '[]',
  tasks jsonb not null default '[]',
  inventory jsonb not null default '[]',
  report jsonb,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id text primary key,
  title text not null default '',
  body text not null default '',
  date text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists activity (
  id text primary key default substr(md5(random()::text), 1, 12),
  who text not null default '',
  what text not null default '',
  team_id text,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Everyone (the congregation) can READ. Only signed-in admins can WRITE.
-- The one exception: members can claim an open volunteer task through the
-- claim_task function below, which only allows that specific, safe change.

alter table teams enable row level security;
alter table people enable row level security;
alter table events enable row level security;
alter table announcements enable row level security;
alter table activity enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "admin write teams" on teams for all to authenticated using (true) with check (true);

create policy "public read people" on people for select using (true);
create policy "admin write people" on people for all to authenticated using (true) with check (true);

create policy "public read events" on events for select using (true);
create policy "admin write events" on events for all to authenticated using (true) with check (true);

create policy "public read announcements" on announcements for select using (true);
create policy "admin write announcements" on announcements for all to authenticated using (true) with check (true);

create policy "public read activity" on activity for select using (true);
create policy "admin write activity" on activity for all to authenticated using (true) with check (true);

-- ---------- Member signup function ----------
-- Lets anonymous members claim an UNASSIGNED, not-done task by name.
-- It cannot reassign, un-assign, or touch anything else.

create or replace function claim_task(p_event_id text, p_task_id text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_event events%rowtype;
  v_tasks jsonb;
  v_claimed boolean := false;
begin
  if p_name is null or length(trim(p_name)) = 0 or length(p_name) > 80 then
    return;
  end if;

  select * into v_event from events where id = p_event_id;
  if not found then return; end if;

  select jsonb_agg(
           case
             when t->>'id' = p_task_id
              and coalesce(t->>'assignee', '') = ''
              and coalesce((t->>'done')::boolean, false) = false
             then jsonb_set(t, '{assignee}', to_jsonb(trim(p_name)))
             else t
           end
         ),
         bool_or(
           t->>'id' = p_task_id
           and coalesce(t->>'assignee', '') = ''
           and coalesce((t->>'done')::boolean, false) = false
         )
    into v_tasks, v_claimed
    from jsonb_array_elements(v_event.tasks) t;

  if not coalesce(v_claimed, false) then return; end if;

  update events set tasks = coalesce(v_tasks, '[]'::jsonb) where id = p_event_id;

  update teams
     set volunteers = volunteers || to_jsonb(trim(p_name))
   where id = v_event.team_id
     and not volunteers ? trim(p_name);

  insert into people (id, name)
  select substr(md5(random()::text), 1, 12), trim(p_name)
   where not exists (select 1 from people where name = trim(p_name));

  insert into activity (who, what, team_id)
  values (trim(p_name), 'signed up to help with "' || v_event.title || '"', v_event.team_id);
end;
$fn$;

grant execute on function claim_task(text, text, text) to anon, authenticated;

-- ---------- Realtime ----------

alter publication supabase_realtime add table teams, people, events, announcements, activity;

-- ---------- Seed data ----------

insert into teams (id, name, color, icon, goal, lead, volunteers) values
  ('children', 'Children''s Ministry Team', '#C98A2D', '✦',
   'Engage local children in the area and help them grow in their faith through lessons, crafts, and play.',
   'Maria Thompson',
   '["Maria Thompson","James Okafor","Ruth Alvarez","Daniel Kim","Sophie Bell"]'),
  ('coffee', 'Coffee Ministry Team', '#6F4E37', '☕',
   'Welcome every member with warm hospitality — coffee and conversation after Sunday service, every week.',
   'Gerald Nwosu',
   '["Gerald Nwosu","Patty Larson","Ken Whitfield","Amara Diaz"]'),
  ('lunch', 'Wednesday Friends Lunch Team', '#56789B', '❋',
   'Give seniors in our congregation company and care — we eat together, pray together, and spend time together.',
   'Dorothy Hayes',
   '["Dorothy Hayes","Frank Miller","Grace Chen","Leon Baptiste"]')
on conflict (id) do nothing;

insert into people (id, name, phone, email) values
  ('p01', 'Maria Thompson', '(760) 555-0101', 'maria@example.com'),
  ('p02', 'James Okafor', '(760) 555-0102', 'james@example.com'),
  ('p03', 'Ruth Alvarez', '(760) 555-0103', 'ruth@example.com'),
  ('p04', 'Daniel Kim', '(760) 555-0104', 'daniel@example.com'),
  ('p05', 'Sophie Bell', '(760) 555-0105', 'sophie@example.com'),
  ('p06', 'Gerald Nwosu', '(760) 555-0106', 'gerald@example.com'),
  ('p07', 'Patty Larson', '(760) 555-0107', 'patty@example.com'),
  ('p08', 'Ken Whitfield', '(760) 555-0108', 'ken@example.com'),
  ('p09', 'Amara Diaz', '(760) 555-0109', 'amara@example.com'),
  ('p10', 'Dorothy Hayes', '(760) 555-0110', 'dorothy@example.com'),
  ('p11', 'Frank Miller', '(760) 555-0111', 'frank@example.com'),
  ('p12', 'Grace Chen', '(760) 555-0112', 'grace@example.com'),
  ('p13', 'Leon Baptiste', '(760) 555-0113', 'leon@example.com')
on conflict (id) do nothing;

insert into events (id, team_id, title, day, date, time, location, status, goal, instructions, tasks, inventory, report) values
  ('e1', 'coffee', 'Sunday Coffee Fellowship', 'Sunday', 'Jul 5', '11:30 AM – 1:00 PM', 'Fellowship Hall', 'upcoming',
   'Make sure no one leaves worship without a warm cup and a warm word. Target: serve 80+ members and greet every first-time visitor by name.',
   $j$["Arrive by 10:45 AM to unlock the Fellowship Hall kitchen.","Brew three urns: regular, decaf, and hot water for tea.","Set the serving table with cups, creamer, sugar, and the donation basket.","Two volunteers stay at the table to pour and greet; look for new faces.","Wipe down, wash urns, and lock up by 1:00 PM."]$j$,
   $j$[{"id":"t1","name":"Brew coffee (3 urns)","assignee":"Patty Larson","done":false},{"id":"t2","name":"Set up serving table","assignee":null,"done":false},{"id":"t3","name":"Bring creamer & cookies","assignee":"Ken Whitfield","done":true},{"id":"t4","name":"Greeter at the table","assignee":null,"done":false},{"id":"t5","name":"Cleanup crew","assignee":"Amara Diaz","done":false}]$j$,
   $j$[{"id":"i1","item":"Ground coffee (lbs)","have":4,"need":6},{"id":"i2","item":"Paper cups","have":220,"need":150},{"id":"i3","item":"Creamer bottles","have":2,"need":4},{"id":"i4","item":"Sugar packets","have":300,"need":150}]$j$,
   null),
  ('e2', 'lunch', 'Wednesday Friends Lunch', 'Wednesday', 'Jul 8', '12:00 PM – 1:30 PM', 'Rosa''s Kitchen (offsite)', 'upcoming',
   'Company and care for our seniors. Everyone shares a meal, we open and close in prayer, and no one eats alone this Wednesday.',
   $j$["Call the confirmed list on Tuesday to remind everyone and check ride needs.","Reserve the long table at Rosa's for 14 by Monday evening.","Drivers pick up at 11:30 AM; meet in the church parking lot first.","Dorothy opens with prayer; lunch and conversation follow.","Close with a short prayer and prayer requests. Drivers return everyone home."]$j$,
   $j$[{"id":"t6","name":"Reminder calls (Tuesday)","assignee":"Grace Chen","done":true},{"id":"t7","name":"Reserve table for 14","assignee":"Dorothy Hayes","done":true},{"id":"t8","name":"Driver — north side pickups","assignee":"Frank Miller","done":false},{"id":"t9","name":"Driver — south side pickups","assignee":null,"done":false},{"id":"t10","name":"Collect prayer requests","assignee":null,"done":false}]$j$,
   $j$[{"id":"i5","item":"Ride seats available","have":6,"need":8},{"id":"i6","item":"Large-print hymn sheets","have":15,"need":14}]$j$,
   null),
  ('e3', 'children', 'Kids'' Summer Bible Adventure', 'Saturday', 'Jul 11', '10:00 AM – 12:00 PM', 'Education Wing, Room 4', 'upcoming',
   'Lesson: the Parable of the Sower. Every child hears the story, makes the seed-jar craft, and leaves knowing they are welcome here. Target: 20 kids.',
   $j$["Set up Room 4 by 9:15 AM — circle rug, craft tables, check-in table at the door.","Parents sign kids in at the check-in table; name tags for everyone.","10:00 — welcome songs. 10:20 — Parable of the Sower story time.","10:45 — seed-jar craft (soil, seeds, jars in the supply bin).","11:30 — snack, then pickup. Two volunteers stay until the last child leaves."]$j$,
   $j$[{"id":"t11","name":"Print lesson plans & name tags","assignee":"Maria Thompson","done":true},{"id":"t12","name":"Prep seed-jar craft kits (x20)","assignee":null,"done":false},{"id":"t13","name":"Snack duty (nut-free)","assignee":"Sophie Bell","done":false},{"id":"t14","name":"Check-in table","assignee":null,"done":false},{"id":"t15","name":"Room setup & teardown","assignee":"Daniel Kim","done":false}]$j$,
   $j$[{"id":"i7","item":"Craft jars","have":12,"need":20},{"id":"i8","item":"Seed packets","have":20,"need":20},{"id":"i9","item":"Juice boxes","have":30,"need":24},{"id":"i10","item":"Name tag stickers","have":40,"need":25}]$j$,
   null),
  ('e0', 'coffee', 'Sunday Coffee Fellowship', 'Sunday', 'Jun 28', '11:30 AM – 1:00 PM', 'Fellowship Hall', 'past',
   'Serve 80+ members after worship and greet every visitor.',
   '[]',
   $j$[{"id":"p1","name":"Brew coffee","assignee":"Patty Larson","done":true},{"id":"p2","name":"Serving table","assignee":"Gerald Nwosu","done":true},{"id":"p3","name":"Cleanup","assignee":"Amara Diaz","done":true}]$j$,
   '[]',
   $j${"attendance":84,"newVisitors":3,"highlights":"Two new families stayed for nearly an hour — connected the Ruiz family with the Children's Ministry team. Ran out of decaf by 12:15; ordering an extra pound next week.","followUps":"Call the Ruiz family this week. Restock decaf before Jul 5."}$j$)
on conflict (id) do nothing;

insert into announcements (id, title, body, date) values
  ('a1', 'Craft jar drive for Kids'' Bible Adventure',
   'We''re 8 jars short for Saturday''s seed-jar craft. Clean glass jars can be dropped at the church office by Thursday, Jul 9.', 'Jul 2'),
  ('a2', 'New here? Come find us after service',
   'The Coffee Ministry table in the Fellowship Hall is the easiest place to say hello and learn about our small groups.', 'Jun 30')
on conflict (id) do nothing;

insert into activity (who, what, team_id) values
  ('Church office', 'set up Ministry Task Group', null);
