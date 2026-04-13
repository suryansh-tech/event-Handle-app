-- supabase/migrations/001_initial_schema.sql

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text,
  email text,
  role text CHECK (role IN ('super_admin', 'club_admin', 'judge', 'viewer')),
  created_at timestamptz DEFAULT now()
);

-- 2. Table: events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT false,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2.5 Table: event_judges
CREATE TABLE public.event_judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  judge_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, judge_id)
);

-- 3. Table: rounds
CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer,
  created_at timestamptz DEFAULT now()
);

-- 4. Table: participants
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  enrollment_no text,
  branch text,
  year text,
  email text,
  extra_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Table: criteria
CREATE TABLE public.criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  name text NOT NULL,
  max_score numeric NOT NULL,
  weightage numeric DEFAULT 1,
  display_order integer,
  created_at timestamptz DEFAULT now()
);

-- 6. Table: scores
CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE,
  criteria_id uuid REFERENCES public.criteria(id) ON DELETE CASCADE,
  judge_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, criteria_id, judge_id)
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Events: super_admin full access, others read-only
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Super admins can insert events" ON public.events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can update events" ON public.events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can delete events" ON public.events FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Event Judges: super_admin full access, judges read own
CREATE POLICY "Event judges viewable by assigned judge or admin" ON public.event_judges FOR SELECT USING (
  judge_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can manage event judges" ON public.event_judges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Rounds: super_admin full access, assigned judges read-only
CREATE POLICY "Rounds viewable by assigned judges and admins" ON public.rounds FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_judges WHERE judge_id = auth.uid() AND event_id = public.rounds.event_id) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can insert rounds" ON public.rounds FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can update rounds" ON public.rounds FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can delete rounds" ON public.rounds FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Participants: super_admin full access, assigned judges read-only
CREATE POLICY "Participants viewable by assigned judges and admins" ON public.participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_judges WHERE judge_id = auth.uid() AND event_id = public.participants.event_id) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can insert participants" ON public.participants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can update participants" ON public.participants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can delete participants" ON public.participants FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Criteria: super_admin full access, assigned judges read-only
CREATE POLICY "Criteria viewable by assigned judges and admins" ON public.criteria FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rounds r 
    JOIN public.event_judges ej ON ej.event_id = r.event_id
    WHERE r.id = public.criteria.round_id AND ej.judge_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can insert criteria" ON public.criteria FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can update criteria" ON public.criteria FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Super admins can delete criteria" ON public.criteria FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Scores: judges can insert/update only their own scores, super_admin reads all
CREATE POLICY "Scores viewable by judges (own) and admins (all)" ON public.scores FOR SELECT USING (
  judge_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Judges can insert own scores" ON public.scores FOR INSERT WITH CHECK (
  judge_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'judge')
);
CREATE POLICY "Judges can update own scores" ON public.scores FOR UPDATE USING (
  judge_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'judge')
);

-- Function: get_leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_event_id uuid)
RETURNS TABLE (
  participant_id uuid,
  name text,
  enrollment_no text,
  branch text,
  year text,
  round_scores jsonb,
  weighted_total numeric,
  rank bigint
) AS $$
BEGIN
  -- First verify if the event is published OR if the caller is an admin/judge explicitly linked to it
  -- If not, return nothing (protects unpublished leaderboards)
  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.is_published = true
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.event_judges WHERE event_id = p_event_id AND judge_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH avg_scores AS (
    SELECT 
      s.participant_id,
      r.id as round_id,
      r.name as round_name,
      s.criteria_id,
      c.name as criteria_name,
      c.max_score,
      c.weightage,
      AVG(s.score) as avg_score
    FROM public.scores s
    JOIN public.criteria c ON c.id = s.criteria_id
    JOIN public.rounds r ON r.id = c.round_id
    JOIN public.participants p ON p.id = s.participant_id
    WHERE p.event_id = p_event_id AND r.event_id = p_event_id
    GROUP BY s.participant_id, r.id, r.name, s.criteria_id, c.name, c.max_score, c.weightage
  ),
  aggregated_rounds AS (
    SELECT
      a.participant_id,
      a.round_id,
      a.round_name,
      jsonb_object_agg(a.criteria_name, a.avg_score) as crit_scores,
      SUM((a.avg_score / NULLIF(a.max_score, 0)) * a.weightage) as round_weighted_total
    FROM avg_scores a
    GROUP BY a.participant_id, a.round_id, a.round_name
  ),
  participant_totals AS (
    SELECT
      ar.participant_id,
      jsonb_object_agg(ar.round_name, 
        jsonb_build_object(
          'criteria_scores', ar.crit_scores, 
          'round_total', ar.round_weighted_total
        )
      ) as round_scores_json,
      SUM(ar.round_weighted_total) as grand_weighted_total
    FROM aggregated_rounds ar
    GROUP BY ar.participant_id
  )
  SELECT 
    p.id as part_id,
    p.name as part_name,
    p.enrollment_no as part_enroll,
    p.branch as part_branch,
    p.year as part_year,
    COALESCE(pt.round_scores_json, '{}'::jsonb) as round_scores,
    ROUND(COALESCE(pt.grand_weighted_total, 0), 2) as weighted_total,
    RANK() OVER (ORDER BY COALESCE(pt.grand_weighted_total, 0) DESC) as rank
  FROM public.participants p
  LEFT JOIN participant_totals pt ON pt.participant_id = p.id
  WHERE p.event_id = p_event_id
  ORDER BY weighted_total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
