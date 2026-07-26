# typerace

A modern, real-time multiplayer typing game — React 19 + Vite + Tailwind v4 on the frontend, Supabase (Postgres, Auth, Realtime, RLS) on the backend.

## Stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS v4, Framer Motion, TanStack Query, Zustand, TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Row Level Security)
- **Deployment:** Vercel (frontend) + Supabase Cloud (backend)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

You need a Supabase project (free tier is fine).

1. Create a project at [supabase.com](https://supabase.com).
2. Install the Supabase CLI if you don't have it: `npm install -g supabase`.
3. Link your project: `supabase link --project-ref <your-project-ref>`.
4. Push the schema: `supabase db push` (runs everything in `supabase/migrations/` in order).

   **If room creation or saving solo results fails**, your remote database is missing the latest fixes. Either:

   - **SQL Editor (fastest):** Supabase Dashboard → **SQL** → New query → paste the contents of [`supabase/APPLY_NOW.sql`](supabase/APPLY_NOW.sql) → **Run**.
   - **CLI:** `npm run db:fix` after adding `SUPABASE_DB_URL` to `.env` (Database → Connection string URI from the dashboard).

   That migration fixes RLS infinite recursion on `room_players` and adds `create_room`, `record_practice_result`, and related RPCs.
5. (Optional, for local dev data) seed it: `supabase db reset` — this also runs `supabase/seed.sql`, or run `psql <connection-string> -f supabase/seed.sql` directly against a remote project.
6. In the Supabase dashboard, enable the **Google** and **GitHub** OAuth providers under Authentication → Providers if you want social login (add their client ID/secret).

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your project's URL and anon key (Project Settings → API in the Supabase dashboard):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:5173`.

### 5. Run tests

```bash
npm run test        # single run
npm run test:watch  # watch mode
```

### 6. Build for production

```bash
npm run build
npm run preview      # sanity-check the production build locally
```

## Deploying

- **Frontend:** push to GitHub, import the repo in Vercel. `vercel.json` is already configured (SPA rewrites so client-side routing works on refresh). Set the two `VITE_SUPABASE_*` env vars in the Vercel project settings.
- **Backend:** Supabase Cloud — migrations live in `supabase/migrations/`, run via `supabase db push` against your linked project. Realtime is enabled per-table in `0005_realtime.sql`.

## Project structure

```
src/
  components/ui/     Reusable primitives (Button, Card, Input, Navbar…)
  features/          Feature-sliced modules: auth, typing, multiplayer, profile, messages
  pages/             Route-level components
  routes/            ProtectedRoute wrapper
  contexts/          AuthContext (Supabase session state)
  store/             Zustand app-settings store (accent color, sound toggles)
  services/          Supabase data-access layer (rooms, matches, profile, friends, messages…)
  lib/               supabase client, query client, cn() helper, synthesized sound fx
  types/             Domain types + generated-style Database types

supabase/
  migrations/        Numbered SQL migrations (schema -> RLS -> functions -> realtime -> achievements -> DMs)
  seed.sql           Sample texts + achievement catalog for local dev
  config.toml        Local Supabase CLI config
```

## How the schema fits together

- `profiles` — one row per user, auto-created via a trigger on `auth.users` insert.
- `rooms` / `room_players` — multiplayer lobby + live race state, replicated over Realtime.
- `matches` / `match_results` — a race's snapshot text and each player's final stats; inserting a result triggers profile-stat rollups, daily-stat rollups, and achievement checks server-side.
- `texts` — the typing content pool (words/quotes), publicly readable.
- `friendships`, `notifications`, `messages` — social layer; notifications are inserted automatically by triggers on friend-request/accept events.
- `direct_messages` — player-to-player DMs, separate from in-room race chat (`messages`). Sending requires an accepted friendship; a trigger notifies the recipient, and `list_conversations()` / `mark_conversation_read()` RPCs back the `/messages` inbox UI.
- `practice_results` — one row per completed solo test (mode/duration/word_count + wpm/accuracy), added in `0012_leaderboard_v2.sql` so the leaderboard can rank by actual test type (e.g. "time 15" vs "time 60") instead of just an all-time best. `match_results` got the same `mode`/`duration`/`word_count` columns so multiplayer races count too. The `leaderboard_query()` function combines both sources, filtered by period + test config, for the `/leaderboard` page's period / scope (everyone vs. friends) / test-type filters.
- `achievements` / `user_achievements` — catalog + earned records, auto-awarded via a trigger.
- Leaderboards are SQL views (`leaderboard_daily/weekly/monthly/all_time`) rather than application-computed aggregates, so ranking stays consistent and fast.

All tables have RLS enabled — see `0003_rls.sql` (and `0011_direct_messages.sql` for DMs) for the full policy set (e.g. private rooms are invisible to non-members except via the invite-code lookup function; chat is scoped to room members; only a room's host can start a race; direct messages are only sendable between friends).

## Notes on what's stubbed vs. real

- **Auth:** fully wired to Supabase (email/password + Google/GitHub OAuth). OAuth needs provider credentials configured in your Supabase project to actually work.
- **Sound:** synthesized in-browser via the Web Audio API (no external audio assets to license) — see `src/lib/sounds.ts`.
- **Text corpus:** a small local word/quote bank ships as a fallback (`src/features/typing/textBank.ts`); multiplayer races pull from the `texts` table instead.
- **Direct messages:** fully wired (schema, RLS, realtime, inbox UI) — friends-only by design; there's no blocking/reporting flow yet.
- **Anti-cheat, tournaments, ranked ELO, clans:** not implemented — the schema and service layer are structured so they can be added as additional tables/services without reshaping what's here.
