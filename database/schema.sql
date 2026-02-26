-- Kanban Board Consolidated Schema
-- Includes Collaboration Features, Real-time Sync, and soft-delete system.

-- 1. Tables
-- Profiles (Links to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL
);

-- Project Members Table for Collaboration
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Fixed relationship to profiles
  role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Columns
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'zinc',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL,
  is_archive_pool BOOLEAN DEFAULT FALSE
);

-- Ensure only one archive pool per project
CREATE UNIQUE INDEX unique_project_archive_pool ON columns (project_id) WHERE is_archive_pool = true;

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id UUID REFERENCES columns ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL, -- Denormalized for performance/RLS
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL,
  previous_column_id UUID REFERENCES columns(id) ON DELETE SET NULL
);

-- 2. Security Functions (to break RLS recursion)
-- Function to get project owner without triggering RLS logic loops
CREATE OR REPLACE FUNCTION get_project_owner(p_id UUID)
RETURNS UUID AS $$
  SELECT user_id FROM public.projects WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Set replica identity to FULL for comprehensive real-time payloads
ALTER TABLE columns REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;

-- Profiles Policies
CREATE POLICY "Users can search and view all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view and manage their own or shared projects" ON projects
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid())
  );

-- Project Members Policies
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    get_project_owner(project_id) = auth.uid()
  );

CREATE POLICY "Owners can manage project members" ON project_members
  FOR ALL USING (get_project_owner(project_id) = auth.uid());

-- Columns Policies
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

-- Tasks Policies
CREATE POLICY "Users can manage tasks in their columns" ON tasks
  FOR ALL USING (
    get_project_owner(project_id) = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'editor')
    )
  );

-- 4. Triggers & Functions
-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 5. Real-time Setup
-- Enable real-time for ALL relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- 6. Helper: Backfill project_id for tasks (useful if resetting or updating)
UPDATE tasks t
SET project_id = c.project_id
FROM columns c
WHERE t.column_id = c.id AND t.project_id IS NULL;
