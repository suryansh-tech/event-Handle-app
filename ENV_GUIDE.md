# Environment Variables Guide

To run the EventRank application, you need to connect it to a Supabase backend. Supabase handles our database, authentication, and real-time features.

For this to work natively, Next.js needs a `.env.local` file at the root of the project (`Event app/.env.local`).

## The Variables You Need

You need to define exactly these three variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🛠️ Step-by-Step Guide: How to get these values

### Step 1: Create a Supabase Project
1. Go to [database.new](https://database.new) or [supabase.com/dashboard](https://supabase.com/dashboard) and log in.
2. Click **"New Project"**.
3. Select an organization (or create one), give your project a name (e.g., `eventrank`), create a strong database password, and choose a region close to you.
4. Click **"Create new project"**. *Note: It takes a few minutes for the database to provision.*

### Step 2: Get your URL and Anon Key
Once your project has finished provisioning:
1. In the Supabase dashboard, look at the sidebar on the left and click the **"Settings"** (gear) icon at the bottom.
2. Click **"API"** under the Configuration section.
3. Under **Project URL**, you will find your URL.
   * Copy this and paste it as `NEXT_PUBLIC_SUPABASE_URL`.
   * *Example: `https://abcdefghijklmonp.supabase.co`*
4. Still on the API page, look under **Project API keys**.
5. Find the key labeled `anon` `public`. 
   * Copy this and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   * *Note: This key is safe to be exposed in the browser. It allows the browser to connect to Supabase, but Row Level Security (RLS) protects the actual data.*

### Step 3: Get your Service Role Key
We need the Service Role key for our Next.js backend (Server Actions) to bypass Row Level Security when we are explicitly performing Super Admin functions, like forcefully inviting new judges via email without a sign-up form.

1. On the same **API** settings page in Supabase, look under **Project API keys** again.
2. Find the key labeled `service_role` `secret`.
3. You will need to click **"Reveal"** to see it.
4. Copy this and paste it as `SUPABASE_SERVICE_ROLE_KEY`.
   * *🚨 WARNING: NEVER expose this key to the browser/frontend. Keep it only in `.env.local` so only Next.js Server Components and Server Actions can read it.*

---

## Final `.env.local` Setup

Create a file named `.env.local` in the `Event app` folder and paste your values in like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJrtyugihjiJIUsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJwdhgjkIsInR5cCI6IkpXVCJ9...
```

Once this file exists and contains these three values, the application will be able to start properly!
