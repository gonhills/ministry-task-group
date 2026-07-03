# Ministry Task Group

Small-group and activity organizer for First UMC Ridgecrest. Two views:

- **Member view** — this week's activities, group info, and one-tap volunteer signup.
- **Admin view** — event readiness, task delegation, inventory watch, lead activity, and progress reports. Everything is editable: groups, people, activities, tasks, instructions, and supplies.

## Run it locally

```bash
npm install
npm run dev
```

## Deploy to Vercel (public link)

Easiest path, no code tools needed:

1. Create a free account at https://vercel.com (sign up with GitHub, Google, or email).
2. Push this folder to a GitHub repository (or drag-and-drop: Vercel's "Add New → Project" page also accepts an import from Git).
3. In Vercel, click **Add New → Project**, pick the repository, and click **Deploy**. Vercel auto-detects Vite; no settings changes needed.
4. You'll get a public URL like `ministry-task-group.vercel.app`. You can add a custom domain later in the project's Settings → Domains.

Command-line alternative, from inside this folder:

```bash
npm install
npx vercel
```

and follow the prompts (it will ask you to log in the first time).

## Important limitation

This is a front-end prototype. **Data does not persist or sync** — every visitor sees the sample data, and edits vanish on refresh. Before using it for real coordination, it needs a database and sign-in (e.g., Supabase or Firebase behind this same interface).
