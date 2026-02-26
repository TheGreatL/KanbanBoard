-- Fix for project_members relationship to profiles

-- Update project_members to reference public.profiles instead of auth.users
-- This allows PostgREST to perform automatic joins
ALTER TABLE project_members 
DROP CONSTRAINT IF EXISTS project_members_user_id_fkey,
ADD CONSTRAINT project_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
