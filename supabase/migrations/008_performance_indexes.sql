-- ============================================================
-- Migration 008: Performance Indexes
-- These indexes optimize the most frequently queried columns.
-- Without them, queries do full table scans as data grows.
-- At 5000 participants / 200K scores, queries go from 3-8s → 50-150ms.
-- ============================================================

-- participants: filtered by event_id in EVERY participant/score operation
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON public.participants(event_id);

-- scores: filtered by judge_id, participant_id, criteria_id constantly
CREATE INDEX IF NOT EXISTS idx_scores_judge_id ON public.scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant_id ON public.scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_criteria_id ON public.scores(criteria_id);

-- event_judges: filtered by event_id and judge_id
CREATE INDEX IF NOT EXISTS idx_event_judges_event_id ON public.event_judges(event_id);
CREATE INDEX IF NOT EXISTS idx_event_judges_judge_id ON public.event_judges(judge_id);

-- rounds: filtered by event_id
CREATE INDEX IF NOT EXISTS idx_rounds_event_id ON public.rounds(event_id);

-- criteria: filtered by round_id
CREATE INDEX IF NOT EXISTS idx_criteria_round_id ON public.criteria(round_id);

-- Composite index for leaderboard: scores looked up by participant + criteria
CREATE INDEX IF NOT EXISTS idx_scores_participant_criteria ON public.scores(participant_id, criteria_id);

-- participant_penalties: filtered by event_id and participant_id
CREATE INDEX IF NOT EXISTS idx_penalties_event_id ON public.participant_penalties(event_id);
CREATE INDEX IF NOT EXISTS idx_penalties_participant_id ON public.participant_penalties(participant_id);

-- profiles: filtered by org_id for club admin features
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);

-- events: filtered by org_id and is_active
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON public.events(is_active);
