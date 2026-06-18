# Alpha Learn 🎓

Adaptive learning for South African Grade 12 students. Master CAPS content, track your APS score, and get AI-powered feedback on practice answers.

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + Auth + RLS)
- **Anthropic Claude** (AI grading + tutor)
- **Zustand** (client state)
- **Tailwind CSS**

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run both files in order:
   - `sql/schema.sql` — creates all tables, RLS policies, and seeds CAPS data
   - `sql/increment_xp.sql` — adds the XP helper function
3. Go to **Settings → API** and copy your Project URL and anon key

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

Get your Anthropic key at [console.anthropic.com](https://console.anthropic.com).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
alpha-learn/
├── app/
│   ├── layout.tsx              # Root layout + fonts
│   ├── globals.css             # Tailwind + design tokens
│   ├── dashboard/
│   │   ├── page.tsx            # Server component — fetches all data
│   │   └── DashboardClient.tsx # Full dashboard UI
│   ├── practice/
│   │   └── page.tsx            # Practice mode with AI marking
│   └── api/
│       ├── grade/route.ts      # AI grading endpoint
│       └── tutor/route.ts      # Streaming AI tutor endpoint
├── components/
│   └── TutorDrawer.tsx         # Floating AI tutor chat panel
├── utils/supabase/
│   ├── client.ts               # Browser Supabase client
│   └── server.ts               # SSR Supabase client
├── store/
│   └── useAppStore.ts          # Zustand global state
├── types/
│   └── index.ts                # All TypeScript types
├── data/
│   └── universityData.ts       # University APS data + helper
├── sql/
│   ├── schema.sql              # Full DB schema + seed data
│   └── increment_xp.sql        # XP + streak helper function
└── middleware.ts               # Auth guard + session refresh
```

## Pages Built

| Route | Status |
|---|---|
| `/dashboard` | ✅ XP, subjects, APS calculator, leaderboard |
| `/practice` | ✅ Random questions, AI marking, step feedback |
| `/login` + `/signup` | 🔜 Coming next |
| `/learn/[subject]` | 🔜 Coming next |
| `/aps` | 🔜 Coming next |

## First Login

Auth pages aren't built yet. To test locally:

1. Go to your Supabase dashboard → **Authentication → Users → Add user**
2. Create a user with email + password
3. Visit `/dashboard` — the middleware will redirect to `/login` (build that page, or temporarily remove the redirect in `middleware.ts` for testing)
