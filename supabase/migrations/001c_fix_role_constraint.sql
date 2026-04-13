-- 001c_fix_role_constraint.sql
-- This script fixes the restrictive role constraint on the profiles table 
-- by allowing 'club_admin' to be a valid role.

DO $$
DECLARE
    con_name text;
BEGIN
    -- 1. Find the automatically named check constraint on the role column
    SELECT constraint_name INTO con_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND column_name = 'role';
    
    -- 2. Drop the old restrictive constraint (super_admin, judge, viewer)
    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || con_name;
    END IF;
END $$;

-- 3. Apply the new constraint including 'club_admin'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'club_admin', 'judge', 'viewer'));
