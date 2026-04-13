# EventRank - Dynamic Scoring & Leaderboard System

EventRank is a premium, real-time event management and scoring platform designed for hackathons, quizzes, and competitions. Built with Next.js 14 and Supabase.

## ✨ Key Features
- **Admin Dashboard**: Manage events, participants, and judges with a dedicated interface.
- **Dynamic Scoring**: Support for Weighted Average, Total Sum, and Judge Penalties.
- **Live Leaderboard**: High-performance leaderboard with optimized 30-second polling.
- **Judge Dashboard**: Simplified scoring interface for judges with real-time progress tracking and round deadlines.
- **Smart Import**: Import participants and criteria from Google Sheets or CSV files with fuzzy matching.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Account

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Setup environment variables in `.env.local` (see `ENV_GUIDE.md`)
4. Run migrations in your Supabase SQL Editor (see `supabase/migrations/`)
5. Start development server: `npm run dev`

---

## ☁️ Supabase Free Tier Optimization Guide

This project is specifically optimized to run forever on the **Supabase Free Tier**. Below is a guide on how we stay within limits and what you should know to keep your project free.

### 1. The "Realtime" Optimization
- **The Limit**: Supabase Free Tier allows only **200 concurrent Realtime connections**.
- **Our Solution**: We use **30-second polling** for the public leaderboard instead of Realtime subscriptions.
- **The Result**: This allows **thousands of people** to watch the leaderboard simultaneously without crashing your project or hitting connection limits.

### 2. Database Usage (Very Low)
- **The Limit**: 500 MB of database storage.
- **Our Status**: We only store compact text data. You would need roughly **5,000,000 score records** to reach this limit. You are currently using less than 1% of this space even with large events.

### 3. API & Bandwidth (Safe)
- **Unlimited Requests**: The Free Tier provides unlimited API requests. Our 30-second polling is highly efficient.
- **5GB Egress**: Since we only transfer light JSON data (no images), you would need millions of page views to exceed the monthly bandwidth limit.

### 4. Important Maintenance Tips
- **Project Pausing**: If your project is inactive for **1 week**, Supabase will pause it. You can "Restore" it instantly from the Supabase Dashboard at no cost.
- **Avoid Large Media**: Do not upload large images (like high-res participant photos) to Supabase Storage if you want to stay within the 5GB bandwidth and 1GB storage limits. Stick to text-based data for maximum safety.

---

*Project "Level": Currently at Level 1 (Very Low Usage). Perfectly optimized for college/company events.*
