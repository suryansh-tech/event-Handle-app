-- Restore get_leaderboard to original full behavior (no limit)
DROP FUNCTION IF EXISTS public.get_leaderboard(uuid, int);
DROP FUNCTION IF EXISTS public.get_leaderboard(uuid);

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
DECLARE
  v_result_mode text;
BEGIN
  -- First verify if the event is published OR if the caller is an admin/judge explicitly linked to it
  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.is_published = true
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.event_judges WHERE event_id = p_event_id AND judge_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  -- Get the event calculation mode
  SELECT result_mode INTO v_result_mode FROM public.events WHERE id = p_event_id;

  RETURN QUERY
  WITH 
  -- 1. Aggregation Phase
  avg_scores AS (
    SELECT 
      s.participant_id,
      r.id as round_id,
      r.name as round_name,
      s.criteria_id,
      c.name as criteria_name,
      c.max_score,
      c.weightage,
      AVG(s.score) as calc_val
    FROM public.scores s
    JOIN public.criteria c ON c.id = s.criteria_id
    JOIN public.rounds r ON r.id = c.round_id
    JOIN public.participants p ON p.id = s.participant_id
    WHERE p.event_id = p_event_id AND r.event_id = p_event_id
    GROUP BY s.participant_id, r.id, r.name, s.criteria_id, c.name, c.max_score, c.weightage
  ),
  sum_scores AS (
    SELECT 
      s.participant_id,
      r.id as round_id,
      r.name as round_name,
      s.criteria_id,
      c.name as criteria_name,
      c.max_score,
      c.weightage,
      SUM(s.score) as calc_val
    FROM public.scores s
    JOIN public.criteria c ON c.id = s.criteria_id
    JOIN public.rounds r ON r.id = c.round_id
    JOIN public.participants p ON p.id = s.participant_id
    WHERE p.event_id = p_event_id AND r.event_id = p_event_id
    GROUP BY s.participant_id, r.id, r.name, s.criteria_id, c.name, c.max_score, c.weightage
  ),
  base_scores AS (
    SELECT * FROM avg_scores WHERE v_result_mode LIKE 'avg%'
    UNION ALL
    SELECT * FROM sum_scores WHERE v_result_mode LIKE 'sum%'
  ),

  -- 2. Round Aggregation
  aggregated_rounds AS (
    SELECT
      a.participant_id,
      a.round_id,
      a.round_name,
      jsonb_object_agg(a.criteria_name, a.calc_val) as crit_scores,
      SUM(
        CASE 
          WHEN v_result_mode LIKE 'avg%' THEN (a.calc_val / NULLIF(a.max_score, 0)) * a.weightage
          ELSE a.calc_val 
        END
      ) as round_total
    FROM base_scores a
    GROUP BY a.participant_id, a.round_id, a.round_name
  ),

  -- 3. Participant Rollup
  participant_penalties_agg AS (
    SELECT p.participant_id, SUM(p.penalty) as total_penalty
    FROM public.participant_penalties p
    WHERE p.event_id = p_event_id
    GROUP BY p.participant_id
  ),
  participant_totals AS (
    SELECT
      ar.participant_id,
      jsonb_object_agg(ar.round_name, 
        jsonb_build_object(
          'criteria_scores', ar.crit_scores, 
          'round_total', ar.round_total
        )
      ) as round_scores_json,
      SUM(ar.round_total) - COALESCE(
        CASE 
          WHEN v_result_mode LIKE '%_penalty' THEN (SELECT total_penalty FROM participant_penalties_agg pp WHERE pp.participant_id = ar.participant_id)
          ELSE 0 
        END, 0
      ) as grand_total
    FROM aggregated_rounds ar
    GROUP BY ar.participant_id
  )

  -- Final Select
  SELECT 
    p.id as part_id,
    p.name as part_name,
    p.enrollment_no as part_enroll,
    p.branch as part_branch,
    p.year as part_year,
    COALESCE(pt.round_scores_json, '{}'::jsonb) as round_scores,
    ROUND(COALESCE(pt.grand_total, 0), 2) as weighted_total,
    RANK() OVER (ORDER BY COALESCE(pt.grand_total, 0) DESC) as rank
  FROM public.participants p
  LEFT JOIN participant_totals pt ON pt.participant_id = p.id
  WHERE p.event_id = p_event_id
  ORDER BY weighted_total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
