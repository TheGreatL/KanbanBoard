-- Migration: Fix RLS Security, Trigger Robustness, and Performance
-- Date: 2026-02-26
-- Description: Hardens RLS policies, fixes 403 Forbidden on project creation, and adds performance indexes.

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- 2. Security Functions Hardening
CREATE OR REPLACE FUNCTION get_project_owner(p_id UUID)
RETURNS UUID AS $$
  SELECT user_id FROM public.projects WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_project_admin(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id
    ) OR EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = p_id 
      AND user_id = u_id 
      AND role IN ('owner', 'editor')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_project_member(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id
    ) OR EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = p_id 
      AND user_id = u_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Trigger Robustness
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'username', 
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Projects Policies
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (auth.uid() = user_id OR is_project_member(id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can update projects" ON projects;
CREATE POLICY "Owners and editors can update projects" ON projects
  FOR UPDATE 
  USING (auth.uid() = user_id OR is_project_admin(id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_project_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Owners can delete projects" ON projects;
CREATE POLICY "Owners can delete projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Project Members Policies
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can manage project members" ON project_members;
CREATE POLICY "Owners and editors can manage project members" ON project_members
  FOR ALL 
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- 6. Columns Policies
DROP POLICY IF EXISTS "Users can view columns" ON columns;
CREATE POLICY "Users can view columns" ON columns
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can manage columns" ON columns;
CREATE POLICY "Owners and editors can manage columns" ON columns
  FOR ALL 
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- 7. Tasks Policies
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can manage tasks" ON tasks;
CREATE POLICY "Owners and editors can manage tasks" ON tasks
  FOR ALL 
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));
