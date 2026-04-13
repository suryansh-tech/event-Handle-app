-- Update the profiles role check constraint to allow 'viewer' (disabled admin)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'club_admin', 'judge', 'viewer'));
