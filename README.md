# Ministry Task Group

Small-group and activity organizer for First UMC Ridgecrest, backed by Supabase:
every change saves to a real database and syncs live between devices.

- **Member view** (default) — announcements, this week's activities, one-tap volunteer signup, directory (names & groups only).
- **Admin view** (email sign-in) — edit everything: groups, people & contact details, activities, tasks, instructions, inventory, announcements, and progress reports. Live activity feed of who did what.

## One-time setup (about 15 minutes)

### 1. Create the Supabase project
1. Sign up free at https://supabase.com (GitHub, Google, or email).
2. Click **New project**. Name it `ministry-task-group`, set a database password (save it somewhere safe — you won't need it day to day), pick the region closest to you (US West), and create.

### 2. Create the database
1. In the left sidebar, open **SQL Editor**.
2. Open the file `supabase/schema.sql` from this project, copy ALL of it, paste it into the editor, and click **Run**.
3. You should see "Success". This creates the tables, security rules, and your three starter groups.

### 3. Create your admin account(s)
1. Sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the email and a strong password for each person who should have admin access. Check **Auto Confirm User**.
3. That's it — no sign-up is possible from the app itself; only accounts you create here can sign in.

### 4. Connect the app
1. Sidebar → **Settings** (gear) → **API**. Copy two values: **Project URL** and the **anon public** key.
2. **For Vercel:** open your Vercel project → Settings → Environment Variables. Add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
   Then go to Deployments and click **Redeploy** on the latest one.
3. **For running locally:** copy `.env.example` to `.env` and paste the two values in.

Done. The app now loads from your database, and everything anyone changes is saved and visible to everyone.

## Security model (plain English)
- Anyone with the link can **read** everything shown in member view.
- Only signed-in admins can **change** data — enforced by the database itself (Row Level Security), not just hidden buttons.
- The single exception: members can claim an **open** volunteer task by name. A database function allows only that exact change — they can't reassign, edit, or delete anything.
- The "anon public" key is safe to expose in the app; it only grants what the security rules above allow.

## Run locally
```bash
npm install
npm run dev
```

## Everyday changes
Edit files → commit to GitHub → Vercel redeploys automatically. Data lives in Supabase and is untouched by redeploys.
