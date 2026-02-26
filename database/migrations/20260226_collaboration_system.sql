-- Enable Realtime for existing tables
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Project Members Table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policies for project_members
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Owners can manage project members" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid()
    )
  );

-- Update RLS for projects to allow members to view
DROP POLICY IF EXISTS "Users can view and manage their own projects" ON projects;
CREATE POLICY "Users can view and manage their own projects" ON projects
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()
    )
  );

-- Update RLS for columns to allow members to view and manage (based on role)
DROP POLICY IF EXISTS "Users can manage columns of their projects" ON columns;
CREATE POLICY "Users can manage columns of their projects" ON columns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = columns.project_id 
      AND (
        projects.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_members.project_id = projects.id 
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update RLS for tasks to allow members to view and manage
DROP POLICY IF EXISTS "Users can manage tasks in their columns" ON tasks;
CREATE POLICY "Users can manage tasks in their columns" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM columns 
      JOIN projects ON projects.id = columns.project_id
      WHERE columns.id = tasks.column_id 
      AND (
        projects.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_members.project_id = projects.id 
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );
