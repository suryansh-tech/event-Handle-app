-- Migration 002: Judge Invites Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS judge_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  judge_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_judge_invites_token ON judge_invites(token);

-- RLS: Only admins can manage invites
ALTER TABLE judge_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invites"
  ON judge_invites FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Allow service role full access (for server actions)
CREATE POLICY "Service role full access on invites"
  ON judge_invites FOR ALL USING (true);
