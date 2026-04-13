-- 009_jwt_claims_policy.sql

-- 1. Create a function to update the user's role in their auth.users metadata
-- This executes every time a user is inserted or updated in public.profiles.
create or replace function public.handle_update_user_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    json_build_object('role', new.role)::jsonb
  where id = new.id;
  return new;
end;
$$;

-- 2. Create the trigger on public.profiles
drop trigger if exists on_profile_role_update on public.profiles;
create trigger on_profile_role_update
  after insert or update of role
  on public.profiles
  for each row
  execute procedure public.handle_update_user_role();

-- 3. Backfill existing roles into auth.users metadata so existing users don't break
update auth.users
set raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  json_build_object('role', p.role)::jsonb
from public.profiles p
where auth.users.id = p.id;

-- 4. Recreate Policies to Query JWT Claims directly instead of Joining `profiles` --

-- Events
DROP POLICY IF EXISTS "Super admins can insert events" ON public.events;
CREATE POLICY "Super admins can insert events" ON public.events FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can update events" ON public.events;
CREATE POLICY "Super admins can update events" ON public.events FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can delete events" ON public.events;
CREATE POLICY "Super admins can delete events" ON public.events FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- Event Judges
DROP POLICY IF EXISTS "Event judges viewable by assigned judge or admin" ON public.event_judges;
CREATE POLICY "Event judges viewable by assigned judge or admin" ON public.event_judges FOR SELECT USING (
  judge_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can manage event judges" ON public.event_judges;
CREATE POLICY "Super admins can manage event judges" ON public.event_judges FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- Rounds
DROP POLICY IF EXISTS "Rounds viewable by assigned judges and admins" ON public.rounds;
CREATE POLICY "Rounds viewable by assigned judges and admins" ON public.rounds FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_judges WHERE judge_id = auth.uid() AND event_id = public.rounds.event_id) OR
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can insert rounds" ON public.rounds;
CREATE POLICY "Super admins can insert rounds" ON public.rounds FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can update rounds" ON public.rounds;
CREATE POLICY "Super admins can update rounds" ON public.rounds FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can delete rounds" ON public.rounds;
CREATE POLICY "Super admins can delete rounds" ON public.rounds FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- Participants
DROP POLICY IF EXISTS "Participants viewable by assigned judges and admins" ON public.participants;
CREATE POLICY "Participants viewable by assigned judges and admins" ON public.participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_judges WHERE judge_id = auth.uid() AND event_id = public.participants.event_id) OR
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can insert participants" ON public.participants;
CREATE POLICY "Super admins can insert participants" ON public.participants FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can update participants" ON public.participants;
CREATE POLICY "Super admins can update participants" ON public.participants FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can delete participants" ON public.participants;
CREATE POLICY "Super admins can delete participants" ON public.participants FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- Criteria
DROP POLICY IF EXISTS "Criteria viewable by assigned judges and admins" ON public.criteria;
CREATE POLICY "Criteria viewable by assigned judges and admins" ON public.criteria FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rounds r 
    JOIN public.event_judges ej ON ej.event_id = r.event_id
    WHERE r.id = public.criteria.round_id AND ej.judge_id = auth.uid()
  ) OR
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can insert criteria" ON public.criteria;
CREATE POLICY "Super admins can insert criteria" ON public.criteria FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can update criteria" ON public.criteria;
CREATE POLICY "Super admins can update criteria" ON public.criteria FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Super admins can delete criteria" ON public.criteria;
CREATE POLICY "Super admins can delete criteria" ON public.criteria FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- Scores
DROP POLICY IF EXISTS "Scores viewable by judges (own) and admins (all)" ON public.scores;
CREATE POLICY "Scores viewable by judges (own) and admins (all)" ON public.scores FOR SELECT USING (
  judge_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
DROP POLICY IF EXISTS "Judges can insert own scores" ON public.scores;
CREATE POLICY "Judges can insert own scores" ON public.scores FOR INSERT WITH CHECK (
  judge_id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('judge', 'super_admin')
);
DROP POLICY IF EXISTS "Judges can update own scores" ON public.scores;
CREATE POLICY "Judges can update own scores" ON public.scores FOR UPDATE USING (
  judge_id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('judge', 'super_admin')
);

-- Judge Invites (from 002)
DROP POLICY IF EXISTS "Super admins can manage judge invites" ON public.judge_invites;
CREATE POLICY "Super admins can manage judge invites" ON public.judge_invites FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);
