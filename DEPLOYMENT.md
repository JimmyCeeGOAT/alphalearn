# ALPHA Learn — Complete Deployment Guide

## Overview of the Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) on Vercel |
| Database + Auth | Supabase (PostgreSQL) |
| AI Engine | Anthropic Claude (claude-sonnet-4-6) |
| Styling | Tailwind CSS |
| State | Zustand |

---

## Step 1: Set Up Your Supabase Project

### 1.1 Create the Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `alpha-learn`), set a strong database password, pick the **Africa (Cape Town)** region if available, otherwise use **Europe (Frankfurt)** for lowest SA latency.
3. Wait ~2 minutes for the project to provision.

### 1.2 Apply the Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/schema.sql` from this project and **paste the entire contents**.
4. Click **Run** (or press `Ctrl+Enter`).
   - You should see `Success. No rows returned` for each statement.
5. Open a **second new query**, paste the contents of `supabase/rpc.sql`, and click **Run**.

### 1.3 Configure Auth

1. Go to **Authentication → Settings** in your Supabase dashboard.
2. Under **Site URL**, enter your Vercel production URL: `https://your-app.vercel.app`
3. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
4. Email confirmations are enabled by default — leave them on.

### 1.4 Get Your Keys

Go to **Project Settings → API** and copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ *Keep this secret — never expose it client-side*

---

## Step 2: Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key**
2. Copy the key → `ANTHROPIC_API_KEY`
3. Ensure you have credits or a billing method set up.

---

## Step 3: Local Development

```bash
# 1. Clone / download the project
cd alpha-learn

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.local.example .env.local

# 4. Fill in your values in .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 5. Run the dev server
npm run dev

# Open http://localhost:3000
```

---

## Step 4: Deploy to Vercel

### 4.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial ALPHA Learn commit"
gh repo create alpha-learn --public --push
# OR use GitHub Desktop / the GitHub website to create a repo and push
```

### 4.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → **Import Git Repository**
2. Select your `alpha-learn` repo
3. Vercel auto-detects Next.js — no build settings needed
4. **Before clicking Deploy**, click **Environment Variables** and add ALL of the following:

### 4.3 Required Vercel Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ⚠️ Secret — Supabase service role key |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | From console.anthropic.com |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |

> **Tip:** Add all variables with **Environment = Production, Preview, Development** selected.

5. Click **Deploy**. First deployment takes ~2 minutes.

### 4.4 Update Supabase Auth Redirect

After deploying, copy your Vercel URL (e.g. `https://alpha-learn.vercel.app`) and:
1. Go to Supabase → **Authentication → Settings**
2. Update **Site URL** to your Vercel URL
3. Add `https://alpha-learn.vercel.app/auth/callback` to **Redirect URLs**

---

## Step 5: Verify Everything Works

Work through this checklist:

- [ ] Visit your Vercel URL — you're redirected to `/login`
- [ ] Click **Create one free** → sign up with a real email
- [ ] Confirm your email via the link Supabase sends
- [ ] Log in → you land on the **Curriculum Map**
- [ ] Open any topic → watch video → mastery bar increases
- [ ] Go to **Practice Arena** → submit an answer → AI returns feedback + XP
- [ ] Go to **AI Tutor** → ask a maths question → streaming response appears
- [ ] Go to **Rewards** → your XP shows on the leaderboard
- [ ] Go to **University Hub** → adjust marks → APS score updates live → save marks

---

## Project File Structure

```
alpha-learn/
├── supabase/
│   ├── schema.sql          ← Full DB schema + CAPS curriculum seed data
│   └── rpc.sql             ← Helper functions (increment_xp, leaderboard)
├── src/
│   ├── app/
│   │   ├── layout.tsx                    ← Root layout
│   │   ├── page.tsx                      ← Redirects to /curriculum
│   │   ├── globals.css
│   │   ├── (auth)/                       ← Login / signup pages (no sidebar)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── auth/callback/route.ts        ← Email confirmation handler
│   │   ├── (app)/                        ← Main app (auth-guarded, with sidebar)
│   │   │   ├── layout.tsx
│   │   │   ├── curriculum/page.tsx
│   │   │   ├── practice/page.tsx
│   │   │   ├── tutor/page.tsx
│   │   │   ├── rewards/page.tsx
│   │   │   └── university/page.tsx
│   │   └── api/
│   │       ├── mark/route.ts             ← POST: AI marking engine
│   │       ├── tutor/route.ts            ← POST: streaming AI tutor
│   │       ├── leaderboard/route.ts      ← GET: leaderboard data
│   │       └── profile/route.ts          ← PATCH: update subject marks
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── curriculum/
│   │   │   ├── CurriculumClient.tsx
│   │   │   ├── TopicCard.tsx
│   │   │   └── VideoModal.tsx
│   │   ├── practice/
│   │   │   ├── PracticeClient.tsx
│   │   │   └── FeedbackPanel.tsx
│   │   ├── tutor/
│   │   │   └── TutorClient.tsx
│   │   ├── rewards/
│   │   │   └── RewardsClient.tsx
│   │   └── university/
│   │       └── UniversityClient.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 ← Browser Supabase client
│   │   │   └── server.ts                 ← Server + service-role clients
│   │   └── universityData.ts             ← University constants + APS logic
│   ├── store/
│   │   └── useAppStore.ts                ← Zustand global state
│   ├── types/
│   │   └── index.ts                      ← All TypeScript interfaces
│   └── middleware.ts                     ← Session refresh
├── .env.local.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## XP System Reference

| Action | XP Awarded |
|---|---|
| Watch a lesson video (first time) | +10 XP |
| Submit a practice answer | +10 XP × marks earned |
| Ask the AI Tutor | +5 XP |

**APS Conversion** (standard SA NSC scale):

| % Range | APS Points |
|---|---|
| 90–100% | 7 |
| 80–89% | 6 |
| 70–79% | 5 |
| 60–69% | 4 |
| 50–59% | 3 |
| 40–49% | 2 |
| 30–39% | 1 |
| 0–29% | 0 |

---

## Extending the Platform

### Adding More Questions
Insert into the `questions` table via the Supabase SQL editor:
```sql
insert into public.questions (topic_id, body, difficulty, total_marks, correct_answer, keywords, marking_guide)
values (
  (select id from public.topics where slug = 'm-calc-3'),
  'Find the coordinates of the stationary points of f(x) = 2x³ − 3x² − 12x + 5.',
  'hard', 7,
  '(-1; 12) and (2; -15)',
  ARRAY['f''(x)','6x^2','6x','12','stationary'],
  '[{"step":"Differentiate: f''(x) = 6x² − 6x − 12","marks":2},{"step":"Set f''(x) = 0 and solve","marks":2},{"step":"Find x = −1 and x = 2","marks":1},{"step":"Substitute to find y-values","marks":2}]'
);
```

### Adding YouTube Video IDs
Update any topic's `youtube_id` column with the 11-character ID from the YouTube URL (the part after `v=`).

### Switching from Anthropic to OpenAI
In `src/app/api/mark/route.ts` and `src/app/api/tutor/route.ts`, replace the Anthropic SDK calls with the OpenAI SDK. Set `OPENAI_API_KEY` in your environment and use `gpt-4o` as the model.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `relation "profiles" does not exist` | Re-run `schema.sql` in the Supabase SQL editor |
| `increment_xp function not found` | Run `rpc.sql` in the Supabase SQL editor |
| AI Tutor returns 500 | Check `ANTHROPIC_API_KEY` is set correctly in Vercel env vars |
| Email confirmation not arriving | Check Supabase Auth → Logs; check spam folder |
| Videos not loading | YouTube embeds require a real domain — works on Vercel, blocked on some firewalls |
| APS not saving | Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key) |
