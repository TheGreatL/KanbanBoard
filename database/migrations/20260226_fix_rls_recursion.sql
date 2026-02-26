-- Fix for RLS Recursion in projects and project_members

-- 1. Create a function to get project owner without triggering RLS
-- SECURITY DEFINER allows this function to bypass RLS
CREATE OR REPLACE FUNCTION get_project_owner(p_id UUID)
RETURNS UUID AS $$
  -- We use a subquery to avoid any RLS checks on the projects table within this function
  SELECT user_id FROM public.projects WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Update project_members policies to use the function
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    get_project_owner(project_id) = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can manage project members" ON project_members;
CREATE POLICY "Owners can manage project members" ON project_members
  FOR ALL USING (
    get_project_owner(project_id) = auth.uid()
  );

-- 3. Update projects policy
DROP POLICY IF EXISTS "Users can view and manage their own projects" ON projects;
CREATE POLICY "Users can view and manage their own projects" ON projects
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()
    )
  );

-- 4. Update columns policy (already safe as it checks projects, and projects is now safe)
-- But let's make it even more robust
DROP POLICY IF EXISTS "Users can manage columns of their projects" ON columns;
CREATE POLICY "Users can manage columns of their projects" ON columns
  FOR ALL USING (
    get_project_owner(project_id) = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = columns.project_id 
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'editor')
    )
  );

-- 5. Update tasks policy
DROP POLICY IF EXISTS "Users can manage tasks in their columns" ON tasks;
CREATE POLICY "Users can manage tasks in their columns" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM columns 
      WHERE columns.id = tasks.column_id 
      AND (
        get_project_owner(columns.project_id) = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_members.project_id = columns.project_id 
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );
