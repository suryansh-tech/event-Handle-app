-- 011_club_admin_policies.sql
-- In migration 009 we strictly limited DML queries to `super_admin` only for security speed.
-- This migration expands those exact same lightning-fast JWT checks to allow `club_admin` 
-- to manage events strictly within their own assigned Organization Tenant (`org_id`).

-- 1. Upgrade the Trigger to also cache `org_id` directly inside the JWT
CREATE OR REPLACE FUNCTION public.handle_update_user_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    json_build_object('role', NEW.role, 'org_id', NEW.org_id)::jsonb
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 2. Backfill existing active logins with their parent org_id
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  json_build_object('role', p.role, 'org_id', p.org_id)::jsonb
FROM public.profiles p
WHERE auth.users.id = p.id;

-- 3. Tenant Policies for EVENTS
CREATE POLICY "Club admins can insert events" ON public.events FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);
CREATE POLICY "Club admins can update events" ON public.events FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);
CREATE POLICY "Club admins can delete events" ON public.events FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

-- 4. Tenant Policies for ROUNDS
CREATE POLICY "Club admins can manage rounds" ON public.rounds FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = public.rounds.event_id 
    AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
);

-- 5. Tenant Policies for PARTICIPANTS
CREATE POLICY "Club admins can manage participants" ON public.participants FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = public.participants.event_id 
    AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
);

-- 6. Tenant Policies for CRITERIA
CREATE POLICY "Club admins can manage criteria" ON public.criteria FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  EXISTS (
    SELECT 1 FROM public.rounds r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = public.criteria.round_id 
    AND e.org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
);

-- 7. Tenant Policies for EVENT_JUDGES
CREATE POLICY "Club admins can manage event judges" ON public.event_judges FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin' AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = public.event_judges.event_id 
    AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
);
