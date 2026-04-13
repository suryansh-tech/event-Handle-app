# SETUP.md — EventRank Setup Guide

## Prerequisites
- Node.js (v18+)
- npm
- A Supabase project (See `ENV_GUIDE.md` for how to create one)
- Docker (optional, for containerized deployment)

---

## Supabase Dashboard tables
- https://supabase.com/dashboard/project/rqoxxtrscwmywojhziqx/editor/17537?schema=public

## this app admin logins
📧 Your Login Credentials
- Email: `admin@eventrank.com`
- Password: `Admin@123456`

## Local Development

### 1. Install Dependencies
```bash
cd "Event app"
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in the project root with your Supabase credentials.
See **`ENV_GUIDE.md`** for a step-by-step guide on getting these values.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Setup Database
Copy the contents of `supabase/migrations/001_initial_schema.sql` into your Supabase project's SQL Editor and execute it. This creates all tables, RLS policies, and the `get_leaderboard` function.

### 4. Create a Super Admin User
In your Supabase dashboard:
1. Go to **Authentication → Users** and click **Add User**.
2. Enter an email and password.
3. After creation, go to the **SQL Editor** and insert a profile:
```sql
INSERT INTO public.profiles (id, name, email, role) VALUES (
  '<user-uuid-from-auth>', 'Admin Name', 'admin@example.com', 'super_admin'
);
```

### 5. Enable Realtime
In the Supabase dashboard:
1. Go to **Database → Replication**.
2. Toggle ON for the `scores` table so the leaderboard can receive real-time updates.

### 6. Run Dev Server
```bash
npm run dev
```
Open `http://localhost:3000` and login with your Super Admin credentials.

---

## Docker Deployment

### Build
```bash
docker build -t eventrank:latest .
```

### Run
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_key \
  eventrank:latest
```

Access the app at `http://localhost:3000`.

---

## Project Structure
```
src/
├── app/
│   ├── login/page.js          # Auth login
│   ├── auth/callback/route.js  # Auth callback
│   ├── admin/page.js           # Admin dashboard (4 tabs)
│   ├── judge/page.js           # Judge scoring dashboard
│   ├── leaderboard/page.js     # Public live leaderboard
│   ├── layout.js               # Root layout
│   └── page.js                 # Root redirect
├── lib/
│   ├── supabase/               # Supabase clients + middleware
│   ├── actions/                # Server actions
│   ├── fetchSheet.js           # Sheet import utility
│   └── analyzeColumns.js       # Column detection
└── middleware.js                # Route protection
```
