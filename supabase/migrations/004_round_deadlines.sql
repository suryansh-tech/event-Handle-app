-- supabase/migrations/004_round_deadlines.sql

-- Add deadline column to rounds table
ALTER TABLE public.rounds ADD COLUMN deadline timestamptz;

-- Update get_leaderboard to respect deadlines (optional, but good for consistency)
-- Actually, the frontend will handle disabling edits. 
-- If we want the leaderboard to handle it too, we could, but let's stick to the requirements.
