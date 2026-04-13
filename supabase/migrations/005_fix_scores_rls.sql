-- Fix: Allow super_admin to also insert and update scores
-- The original policy only allowed role='judge', blocking admins who are also judges

DROP POLICY IF EXISTS "Judges can insert own scores" ON public.scores;
DROP POLICY IF EXISTS "Judges can update own scores" ON public.scores;

CREATE POLICY "Judges can insert own scores" ON public.scores FOR INSERT WITH CHECK (
  judge_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('judge', 'super_admin')
  )
);

CREATE POLICY "Judges can update own scores" ON public.scores FOR UPDATE USING (
  judge_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('judge', 'super_admin')
  )
);
