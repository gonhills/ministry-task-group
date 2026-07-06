# Ministry Task Group

Small-group and activity organizer for First UMC Ridgecrest, backed by Supabase:
every change saves to a real database and syncs live between devices.

- **Member view** (default) — announcements, this week's activities, one-tap volunteer signup, browsable group pages, church inventory (read-only), directory (names & groups only).
- **Admin view** (unlocked with an admin code) — edit everything: groups, people & contact details, activities, tasks, instructions, supplies, announcements, and progress reports. Live activity feed of who did what.
- **Groups tab** — every small group has its own page. Open a group to see its purpose, roster, and activities; admins tap "Edit this group" to change anything, or "+ New activity for this group" to schedule something.
- **Inventory tab** — church-wide supply tracker with have/need counts, categories, storage locations, low-stock alerts, and a one-tap "Copy shopping list" that gathers everything running short (including event supplies).
- **Lead hub tab** (admins/leads only) — a shared task tracker (to do → in progress → done, with owners and due dates) and a message board so leads can coordinate between Sundays. Everything syncs live to every lead's device.

## One-time setup (about 15 minutes)

### 1. Create the Supabase project
1. Sign up free at https://supabase.com (GitHub, Google, or email).
2. Click **New project**. Name it `ministry-task-group`, set a database password (save it somewhere safe — you won't need it day to day), pick the region closest to you (US West), and create.

### 2. Create the database
1. In the left sidebar, open **SQL Editor**.
2. Open the file `supabase/schema.sql` from this project, copy ALL of it, paste it into the editor, and click **Run**.
3. You should see "Success". This creates the tables, security rules, and your three starter groups.

### 3. Open up saving + set your admin code
1. In Supabase → **SQL Editor**, paste the contents of `supabase/update-policies.sql` and click **Run**.
   (Skip this if you're setting up fresh AND already replaced the write policies — running it twice is harmless.)
2. Your admin code lives near the top of `src/App.jsx` on the line `const ADMIN_CODE = "..."`.
   Change it to whatever you like, commit, and Vercel redeploys with the new code.

Note: this code is checked inside the app, so someone technically savvy could find it by reading
the site's source. Fine for scheduling and coordination — just avoid sensitive personal details.

### 4. Add the Inventory + Lead hub tables (new in v4)
1. In Supabase → **SQL Editor**, paste the contents of `supabase/add-hub-inventory.sql` and click **Run**.
2. That's it — this creates the `inventory`, `lead_tasks`, and `messages` tables. Safe to run more than once.
   (If you skip this, the app still works; the Inventory and Lead hub tabs will show a reminder until you run it.)

### 5. Connect the app
1. Sidebar → **Settings** (gear) → **API**. Copy two values: **Project URL** and the **anon public** key.
2. **For Vercel:** open your Vercel project → Settings → Environment Variables. Add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
   Then go to Deployments and click **Redeploy** on the latest one.
3. **For running locally:** copy `.env.example` to `.env` and paste the two values in.

Done. The app now loads from your database, and everything anyone changes is saved and visible to everyone.

## Security model (plain English)
- Anyone with the link can read everything in member view, and the database accepts changes
  from the app without a login (that's what makes the simple admin code possible).
- The admin code keeps honest people out of the admin tools, but it is not strong security.
- Keep the directory to non-sensitive info. If you later want real protection (per-person
  logins, database-enforced permissions), that's a supported upgrade path.

## Run locally
```bash
npm install
npm run dev
```

## Everyday changes
Edit files → commit to GitHub → Vercel redeploys automatically. Data lives in Supabase and is untouched by redeploys.
