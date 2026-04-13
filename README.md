<div align="center">

<img src="YOUR_LOGO_URL" alt="EventRank Logo" width="80" height="80"/>

# EventRank

**The real-time event judging infrastructure built for Indian colleges.**
From Google Sheets to live leaderboard in under 5 minutes.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Edge_Ready-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

[🌐 Live Demo](https://event-handle-app.vercel.app/super-admin) · [📖 Docs](#-installation--setup) · [🐛 Report Bug](https://github.com/suryansh-tech/event-Handle-app/blob/main/.github/ISSUE_TEMPLATE/bug_report.md) · [💡 Request Feature](https://github.com/suryansh-tech/event-Handle-app/blob/main/.github/ISSUE_TEMPLATE/feature_request.md)

---

<!-- 📸 SCREENSHOT PLACEHOLDER 1 -->
<!-- Add a wide hero screenshot of your leaderboard here -->
<!-- Recommended: 1400x700px, dark theme leaderboard with live badge -->
> **[ADD HERO SCREENSHOT HERE — leaderboard dark theme, fullscreen]**

</div>

---

## 📌 Table of Contents

- [Why EventRank](#-why-eventrank)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Summary](#-summary)

---

## 🤔 Why EventRank?

Most college events still run on **Google Forms + Excel sheets + WhatsApp coordination.**

Judges submit scores on paper. Organizers manually calculate rankings. Results get announced 2 hours after the event ends. The audience has no idea what's happening.

**EventRank fixes this.**

| The Old Way | With EventRank |
|---|---|
| Paper scoresheets | Mobile-first digital scoring |
| Manual Excel calculation | Automatic weighted scoring |
| Results after 2 hours | Live leaderboard, real-time |
| No role management | Super Admin → Club Admin → Judge |
| Sheet upload + manual cleanup | Google Sheets direct import |
| One organizer managing everything | Multiple judges simultaneously |
| No audience engagement | Public live leaderboard with themes |

---

## ✨ Features

### 🏛️ Super Admin Control Center
Full platform oversight from a single dashboard. Manage multiple college clubs, approve organizers, monitor platform health metrics, database storage, and live system diagnostics — all in real-time.

<!-- 📸 SCREENSHOT PLACEHOLDER 2 -->
<!-- Add: Super Admin dashboard — Platform Stats page -->
<!-- Recommended: Show the stats cards + live diagnostics + activity log -->
> **[ADD SCREENSHOT — Super Admin Dashboard / Platform Stats]**

---

### 🏢 Multi-Org Role Hierarchy
Three-tier role system built for real college structures:

```
Super Admin (Platform Owner — You)
    └── Club Admin (Coding Club, Dance Society, Robotics Club...)
            └── Judges (Assigned per event)
```

Club Admins manage their own events independently. Judges only see their assigned event. Zero cross-contamination between organizations — enforced at the database level via Row Level Security.

---

### 📥 Intelligent Participant Import

Paste a Google Sheets link or drop an Excel/CSV file. EventRank automatically:
- Fetches the sheet (no API key needed for public sheets)
- Analyzes all columns with fuzzy header matching
- Shows confidence scores for each detected field
- Lets admin visually select/remap columns
- Detects and flags duplicate enrollment numbers before import

<!-- 📸 SCREENSHOT PLACEHOLDER 3 -->
<!-- Add: Sheet import flow — Step 2 column selector UI -->
<!-- Recommended: Show the column cards with confidence badges + sample values -->
> **[ADD SCREENSHOT — Intelligent Sheet Import / Column Selector]**

---

### 🏆 Dynamic Rounds & Criteria Builder

Create multiple rounds per event (Prelims, Semi-Finals, Finals). Per round, define unlimited custom scoring criteria with:
- Custom name (Innovation, Presentation, Technical Depth...)
- Max score per criteria
- Weightage multiplier
- Drag-to-reorder priority
- Deadline per round with auto-lock

Scoring modes: **AVG · SUM · AVG + Penalty · SUM + Penalty**

<!-- 📸 SCREENSHOT PLACEHOLDER 4 -->
<!-- Add: Setup tab — Rounds & Criteria builder -->
<!-- Recommended: Show an expanded round card with multiple criteria rows -->
> **[ADD SCREENSHOT — Rounds & Criteria Builder]**

---

### 👨‍⚖️ Frictionless Judge Dashboard

Judges receive a 24-hour magic invite link. They set a PIN and land directly on their scoring interface — no app download, no complex login.

**Mobile-first scoring features:**
- Card-by-card participant flow on mobile
- Large number-grid buttons (no tiny inputs)
- Auto-save on blur with visual confirmation
- Scored / Pending filter tabs
- Enrollment number visible to prevent mix-ups
- Sticky progress bar — always visible
- Offline detection with pending sync indicator
- Completion celebration when all participants scored

<!-- 📸 SCREENSHOT PLACEHOLDER 5 -->
<!-- Add: Judge dashboard — mobile view with card scoring -->
<!-- Recommended: Show the scored/pending tabs + progress bar + score inputs -->
> **[ADD SCREENSHOT — Judge Scoring Dashboard]**

---

### 📊 Real-Time Live Leaderboard

Public leaderboard — no login required. Share the URL, project it on screen, let the audience watch rankings update live.

**Leaderboard features:**
- 🔴 LIVE badge with real-time updates
- 🥇🥈🥉 Top 3 highlighted with podium styling
- ↑↓ Rank change animations
- Per-criteria score breakdown columns
- Weighted total with progress bars
- Self-search — participants find their own name instantly
- "X of Y participants scored" scoring progress
- 5 admin-selectable themes

<!-- 📸 SCREENSHOT PLACEHOLDER 6 -->
<!-- Add: Live leaderboard — dark theme, top 5 visible, LIVE badge -->
<!-- Recommended: Show rank medals + score columns + progress bars -->
> **[ADD SCREENSHOT — Live Leaderboard]**

---

### 🏅 Winners Podium

Olympic-style animated winners reveal. Designed for projector display at the end of your event. Top 3 animate onto the podium with confetti burst — built for the crowd moment.

<!-- 📸 SCREENSHOT PLACEHOLDER 7 -->
<!-- Add: Winners podium page — 3 podium positions with names -->
> **[ADD SCREENSHOT — Winners Podium Page]**

---

### 🎨 5 Leaderboard Themes

Admin selects the leaderboard theme before publishing — matched to event type:

| Theme | Best For |
|---|---|
| ⚫ Cyber Dark | Hackathons, Tech events |
| 🟢 Stadium | Sports, Athletics |
| ⚪ Minimal Light | Business, Case competitions |
| 🎨 Festival | Cultural events, Dance |
| 🏆 Royal Gold | Annual fests, Grand finals |

---

### 🔒 Enterprise-Grade Security

- **Row Level Security (RLS)** on every table — database-enforced
- **JWT-injected claims** — judges cannot access other events
- **Score range validation** — server-side, not just client
- **24-hour expiring invite links** — judges only
- **Service role key** — server-side only, never exposed to browser
- **Rate limiting** on score submissions
- **Event status flow** — Draft → Active → Scoring Locked → Ended

---

## 📸 Screenshots

<div align="center">

### Super Admin — Platform Overview
<!-- 📸 SCREENSHOT PLACEHOLDER 8 -->
> **[ADD SCREENSHOT — Super Admin Organizers page with stats banner]**

### Admin — Event Setup
<!-- 📸 SCREENSHOT PLACEHOLDER 9 -->
> **[ADD SCREENSHOT — Admin Setup tab, full page]**

### Admin — Judges Management
<!-- 📸 SCREENSHOT PLACEHOLDER 10 -->
> **[ADD SCREENSHOT — Judges tab with progress bars]**

### Admin — Results Matrix
<!-- 📸 SCREENSHOT PLACEHOLDER 11 -->
> **[ADD SCREENSHOT — Results tab with judge columns + export button]**

### Manage Events
<!-- 📸 SCREENSHOT PLACEHOLDER 12 -->
> **[ADD SCREENSHOT — Manage Events page with scoring mode dropdown open]**

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL EDGE                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Next.js 14 │  │ Edge Runtime │  │  CDN Cache │  │
│  │  App Router │  │  Leaderboard │  │  30s TTL   │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘  │
└─────────┼────────────────┼───────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────┐
│                  SUPABASE (Mumbai)                  │
│                                                     │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │  PostgreSQL  │    │    Supabase Realtime    │    │
│  │  + RLS       │    │    (scores table)       │    │
│  │  + Indexes   │    │    WebSocket channel    │    │
│  │  + Mat. View │    │    per event            │    │
│  └──────────────┘    └─────────────────────────┘    │
│                                                     │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │  Auth (JWT)  │    │    Storage              │    │
│  │  Magic Links │    │    (future uploads)     │    │
│  └──────────────┘    └─────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Data Flow — Score Submission
```
Judge inputs score (mobile)
        ↓
Optimistic UI update (instant feel)
        ↓
Server Action validates:
  - Score within criteria max_score range
  - Judge is assigned to this event
  - Event status = 'active'
        ↓
Supabase UPSERT (conflict on participant+criteria+judge)
        ↓
Realtime broadcast to leaderboard channel
        ↓
Leaderboard recalculates + re-ranks
        ↓
Audience sees update (< 1 second)
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 App Router | Server Components, Edge Runtime, Server Actions |
| Language | TypeScript | Type safety across full stack |
| Styling | Tailwind CSS | Rapid UI, consistent design system |
| Database | Supabase PostgreSQL | RLS, Realtime, free tier generous |
| Auth | Supabase Auth | Magic links, JWT, session management |
| Realtime | Supabase Realtime | WebSocket per event channel |
| File Parsing | papaparse + xlsx | CSV + Excel sheet parsing |
| Icons | lucide-react | Consistent icon set |
| Toasts | sonner | Non-blocking notifications |
| Deployment | Vercel | Edge network, auto CI/CD |

---

## 🚀 Installation & Setup

> **Time to deploy: ~20 minutes** — Follow every step in order.

### Prerequisites

| Requirement | Version | Verify With |
|---|---|---|
| Node.js | 18.x or higher | `node --version` |
| npm | 9.x or higher | `npm --version` |
| Git | Any | `git --version` |
| Supabase Account | Free tier works | [supabase.com](https://supabase.com) |
| Vercel Account *(optional)* | Free tier works | [vercel.com](https://vercel.com) |
| Docker *(optional)* | 20.x+ | `docker --version` |

---

### Step 1 — Clone & Install

```bash
git clone https://github.com/suryansh-tech/event-Handle-app.git
cd event-Handle-app
npm install
```

> **Expected:** ~30 dependencies installed, zero errors.  
> **Troubleshoot:** If `@supabase/ssr` fails, upgrade to Node 18+.

---

### Step 2 — Create a Supabase Project

1. Go to [database.new](https://database.new) and sign in (or [supabase.com/dashboard](https://supabase.com/dashboard))
2. Click **"New Project"**
3. Configure:
   - **Name:** `eventrank` (or any name you prefer)
   - **Database Password:** Choose a strong password — save it securely
   - **Region:** Select the region closest to your users (e.g. `Mumbai` for India, `US East` for North America)
4. Click **"Create new project"**
5. Wait 2–3 minutes for provisioning to finish

---

### Step 3 — Get Your API Keys

Once your Supabase project is ready:

1. In the Supabase Dashboard sidebar, click **Settings** (gear icon) → **API**
2. Copy these 3 values:

| What | Where to Find | Example |
|---|---|---|
| **Project URL** | Under "Project URL" | `https://abcdefgh.supabase.co` |
| **Anon Key** | Under "Project API keys" → `anon` `public` | `eyJhbGci...` |
| **Service Role Key** | Under "Project API keys" → `service_role` `secret` → click **Reveal** | `eyJhbGci...` |

---

### Step 4 — Configure Environment Variables

Create your `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> ⚠️ **NEVER** commit `.env.local` to Git. It is already in `.gitignore`.  
> ⚠️ **NEVER** prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` — it must stay server-side only.

See [`ENV_GUIDE.md`](ENV_GUIDE.md) for a detailed step-by-step walkthrough with screenshots.

---

### Step 5 — Run Database Migrations (In Order)

Go to your **Supabase Dashboard → SQL Editor → New query**.

Run each migration file **one at a time**, in this exact order. Copy the full contents of each file from `supabase/migrations/` and execute:

| # | File | What It Does |
|---|---|---|
| 1 | `001_initial_schema.sql` | Creates all core tables (`profiles`, `events`, `rounds`, `participants`, `criteria`, `scores`, `event_judges`) + RLS policies + `get_leaderboard` RPC function |
| 2 | `001c_fix_role_constraint.sql` | Adds `club_admin` to the allowed profile roles |
| 3 | `002_judge_invites.sql` | Creates `judge_invites` table for 24-hour magic invite links |
| 4 | `003_result_modes_penalties.sql` | Adds `result_mode` column to events, creates `participant_penalties` table, upgrades `get_leaderboard` to support SUM/AVG/Penalty modes |
| 5 | `004_round_deadlines.sql` | Adds `deadline` column to rounds for auto-lock |
| 6 | `005_fix_scores_rls.sql` | Allows super_admin to also submit scores (not just judges) |
| 7 | `007_restore_full_leaderboard.sql` | Restores full leaderboard function without row limits |
| 8 | `007b_organizations_schema.sql` | Creates `organizations` table, adds `org_id`/`phone`/`alt_email`/`last_active_at` to profiles, adds `org_id` to events |
| 9 | `008_performance_indexes.sql` | Creates 15 B-Tree indexes — **critical for production performance** |
| 10 | `009_jwt_claims_policy.sql` | Creates JWT claims trigger, replaces ALL RLS policies to use JWT instead of profile joins — **the single biggest performance upgrade** |
| 11 | `010_update_leaderboard_jwt.sql` | Updates `get_leaderboard` function to use JWT claims |
| 12 | `011_club_admin_policies.sql` | Adds tenant-scoped RLS policies for `club_admin` role |

**Verification:** After running all 12 migrations, go to **Table Editor** and confirm these 10 tables exist:
`profiles` · `events` · `event_judges` · `rounds` · `participants` · `criteria` · `scores` · `judge_invites` · `participant_penalties` · `organizations`

---

### Step 6 — Enable Realtime

1. In the Supabase Dashboard → **Database** → **Replication** (or **Publications**)
2. Find the publication named `supabase_realtime`
3. Toggle **ON** for the `scores` table

> **Without this, the live leaderboard will NOT receive real-time score updates.**

---

### Step 7 — Create Your Super Admin Account

**Option A — Automated (Recommended):**

```bash
node --env-file=.env.local scripts/setup-db.mjs
```

This automatically creates:
- ✅ Auth user: `admin@eventrank.com` / `Admin@123456`
- ✅ Profile row with `role = 'super_admin'`

> ⚠️ **Change the default password immediately after first login.**

**Option B — Manual:**

1. Go to Supabase → **Authentication** → **Users** → **Add User**
2. Enter your email and a strong password, check **"Auto Confirm User"**
3. After creation, copy the user's UUID from the table
4. Go to **SQL Editor** and run:

```sql
INSERT INTO public.profiles (id, name, email, role) VALUES (
  '<paste-user-uuid-here>',
  'Your Name',
  'your@email.com',
  'super_admin'
);
```

---

### Step 8 — Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your Super Admin credentials.

**Expected:** You are redirected to the `/super-admin` dashboard showing Platform Stats, Organizers, and Events tabs.

---

### Step 9 — Configure Auth Redirect URLs (For Production)

After deploying to your production domain:

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Set:

| Field | Value |
|---|---|
| **Site URL** | `https://your-domain.com` |
| **Redirect URLs** | `https://your-domain.com/auth/callback` |

> Without this, magic links and auth callbacks will fail in production.

---

### Step 10 — Post-Setup Checklist

- [ ] Changed default super admin password
- [ ] Verified Realtime is ON for `scores` table
- [ ] Tested full judge flow: invite → open link → set PIN → score participants
- [ ] Verified public leaderboard loads at `/leaderboard` without login
- [ ] Tested Google Sheets import with a public sheet URL
- [ ] Enabled **Connection Pooling** in Supabase (Dashboard → Settings → Database → Connection Pooling → Transaction mode) if expecting 30+ simultaneous judges

---

## 🔑 Environment Variables

| Variable | Where to Find | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → Publishable key (`anon` `public`) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Secret key (`service_role` `secret`) | ✅ |

> ⚠️ **NEVER** commit `.env.local` to Git. It is already in `.gitignore`.
> 
> ⚠️ **NEVER** prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` — it must stay server-side only.

---

## 🗄️ Database Setup

### Tables

```
profiles              — User accounts with roles (super_admin, club_admin, judge, viewer)
organizations         — College clubs / organizer groups
events                — Individual competition events
participants          — Imported students per event
rounds                — Scoring rounds per event (Prelims, Finals...)
criteria              — Scoring criteria per round (Innovation, max 10, weightage 2x)
scores                — Judge scores (upsert on participant+criteria+judge)
event_judges          — Judge ↔ Event assignment mapping
judge_invites         — 24-hour magic invite link tokens
participant_penalties — Per-participant penalty deductions
```

### Performance Indexes

All indexes are created automatically by migration `008_performance_indexes.sql`. These include:

```sql
-- Key indexes (15 total) covering:
idx_participants_event_id         -- Participant lookups by event
idx_scores_judge_id               -- Score lookups by judge
idx_scores_participant_id         -- Score lookups by participant
idx_scores_criteria_id            -- Score lookups by criteria
idx_scores_participant_criteria   -- Composite for leaderboard RPC
idx_event_judges_event_id         -- Judge assignment lookups
idx_event_judges_judge_id         -- Judge assignment lookups
idx_rounds_event_id               -- Round lookups by event
idx_criteria_round_id             -- Criteria lookups by round
idx_penalties_event_id            -- Penalty lookups by event
idx_profiles_org_id               -- Club admin org scoping
idx_events_org_id                 -- Event org scoping
idx_events_is_active              -- Active event filtering
-- ...and more
```

> **Impact:** Read queries under heavy load drop from **~3–8 seconds** to **50–150 milliseconds**.

### Connection Pooling

```
Supabase Dashboard → Settings → Database → Connection Pooling → Enable
Mode: Transaction
```

Required for handling 30+ simultaneous judges without exhausting connection limits.

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

**One-click deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/suryansh-tech/event-Handle-app)

**Manual deploy:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

When prompted, set these environment variables in the Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Required after deploy — Update Supabase Auth URLs:**
```
Supabase → Authentication → URL Configuration

Site URL:       https://your-app.vercel.app
Redirect URLs:  https://your-app.vercel.app/auth/callback
```

---

### Deploy with Docker

```bash
# Build (NEXT_PUBLIC_ vars must be passed at build time for Next.js client bundle)
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -t eventrank:latest .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
  eventrank:latest
```

Access the app at `http://localhost:3000`.

---

### Deploy to Any Node.js VPS

```bash
# Build the production bundle
npm run build

# Start the production server
npm start
```

The `output: 'standalone'` setting in `next.config.mjs` produces a self-contained `server.js`. You can copy `.next/standalone/` to any server with Node.js 18+.

---

## 📈 Roadmap

- [x] Multi-org role hierarchy
- [x] Google Sheets direct import
- [x] Real-time live leaderboard
- [x] Mobile-first judge dashboard
- [x] Winners podium with animations
- [x] 5 leaderboard themes
- [x] Super admin diagnostics
- [x] Export CSV results
- [ ] Tiebreaker resolution system
- [ ] Team events support
- [ ] Auto certificate generation
- [ ] AI event summary (Claude API)
- [ ] WhatsApp result notifications
- [ ] Offline judge scoring (PWA)
- [ ] Multi-college inter-college events

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/AmazingFeature

# Commit your changes
git commit -m 'Add AmazingFeature'

# Push to the branch
git push origin feature/AmazingFeature

# Open a Pull Request
```

Please make sure to:
- Follow the existing code style
- Test on both mobile and desktop
- Update this README if adding new features

---

## 📋 Summary

EventRank is a production-ready, multi-tenant event judging platform built on the Next.js 16 + Supabase stack. It solves the problem of manual, error-prone event scoring by providing:

- **A 4-role access control system** (Super Admin → Club Admin → Judge → Viewer) with JWT-based RLS
- **Real-time judging** with offline support (IndexedDB queue + auto-sync), debounced batch saves, and cross-judge broadcast awareness
- **A PostgreSQL-powered leaderboard** using stored procedures with weighted scoring, penalties, and 4 calculation modes
- A **premium UI** with animated podium, dark sci-fi leaderboard, and glassmorphism admin dashboards
- **16 documented performance optimizations** that reduce query times from 3-8 seconds to 50-150ms at scale

The system is specifically optimized for the Supabase free tier, using polling instead of realtime subscriptions and text-only data to stay within storage/bandwidth limits. It can comfortably handle 5,000+ participants × 10 judges × multiple rounds within free tier constraints.

Key architectural decisions include:

- **Server Actions over API routes** for simplified, type-safe data mutations
- **Dual Supabase client pattern** (user-scoped + admin) for secure privilege separation
- **Dynamic imports** for admin tab components to reduce initial bundle size
- **PostgreSQL RPC** for computationally expensive leaderboard calculations

---

## 👨‍💻 Built By

**Suryansh Porwal** — NIET, Greater Noida  

Solving real-world college problems with scalable, real-time technology.  

From manual judging chaos → live leaderboard systems.  

🚀 Next.js · Supabase · TypeScript

<div align="center">

**If EventRank helped your college event, give it a ⭐ on GitHub!**

[⬆ Back to top](#-eventrank)

</div>
