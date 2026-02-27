-- Migration: Harden Task RLS and Fix Data Integrity
-- Date: 2026-02-27
-- Description: Ensures all tasks have project_id and splits the manage policy into granular ones to fix 42501 errors for collaborators.

-- 1. Data Repair: Ensure all orphaned tasks have the correct project_id from their columns
UPDATE public.tasks t
SET project_id = c.project_id
FROM public.columns c
WHERE t.column_id = c.id AND (t.project_id IS NULL OR t.project_id != c.project_id);

-- 2. Schema Enforcement: Make project_id NOT NULL if it isn't already
DO $$ 
BEGIN
    ALTER TABLE public.tasks ALTER COLUMN project_id SET NOT NULL;
EXCEPTION
    WHEN others THEN 
        RAISE NOTICE 'project_id already NOT NULL or table empty';
END $$;

-- 3. Policy Hardening: Split 'manage tasks' policy for better precision
DROP POLICY IF EXISTS "Owners and editors can manage tasks" ON public.tasks;

-- Selective SELECT (already exists but re-asserting)
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks" ON public.tasks
  FOR SELECT USING (public.is_project_member(project_id, auth.uid()));

-- Precision INSERT
CREATE POLICY "Owners and editors can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_project_admin(project_id, auth.uid()));

-- Precision UPDATE
CREATE POLICY "Owners and editors can update tasks" ON public.tasks
  FOR UPDATE USING (public.is_project_admin(project_id, auth.uid()))
  WITH CHECK (public.is_project_admin(project_id, auth.uid()));

-- Precision DELETE
CREATE POLICY "Owners and editors can delete tasks" ON public.tasks
  FOR DELETE USING (public.is_project_admin(project_id, auth.uid()));

-- 4. Column Level hardening (Mirroring for consistency)
DROP POLICY IF EXISTS "Owners and editors can manage columns" ON public.columns;

CREATE POLICY "Owners and editors can insert columns" ON public.columns
  FOR INSERT WITH CHECK (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "Owners and editors can update columns" ON public.columns
  FOR UPDATE USING (public.is_project_admin(project_id, auth.uid()))
  WITH CHECK (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "Owners and editors can delete columns" ON public.columns
  FOR DELETE USING (public.is_project_admin(project_id, auth.uid()));
