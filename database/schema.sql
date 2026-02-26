-- Kanban Board Consolidated Schema
-- Includes Collaboration Features, Real-time Sync, and soft-delete system.

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tables
-- Profiles (Links to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL
);

-- Project Members Table for Collaboration
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Columns
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'zinc',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL,
  is_archive_pool BOOLEAN DEFAULT FALSE
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id UUID REFERENCES columns ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NULL,
  previous_column_id UUID REFERENCES columns(id) ON DELETE SET NULL
);

-- 2. Indices for performance
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at);
CREATE INDEX IF NOT EXISTS idx_columns_archived_at ON columns(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_columns_is_archive_pool ON columns(is_archive_pool);
CREATE INDEX IF NOT EXISTS idx_tasks_previous_column_id ON tasks(previous_column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_archive_pool ON columns (project_id) WHERE is_archive_pool = true;

-- 3. Security Functions (to break RLS recursion)
-- Function to get project owner without triggering RLS logic loops
CREATE OR REPLACE FUNCTION get_project_owner(p_id UUID)
RETURNS UUID AS $$
  SELECT user_id FROM public.projects WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Function to check if a user is an owner or editor of a project
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

-- Function to check if a user is a member of a project (breaks recursion)
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

-- 4. Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Set replica identity to FULL for comprehensive real-time payloads
ALTER TABLE columns REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can search and view all profiles" ON profiles;
CREATE POLICY "Users can search and view all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Projects Policies
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

-- Project Members Policies
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can manage project members" ON project_members;
CREATE POLICY "Owners and editors can manage project members" ON project_members
  FOR ALL 
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- Columns Policies
DROP POLICY IF EXISTS "Users can view columns" ON columns;
CREATE POLICY "Users can view columns" ON columns
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can manage columns" ON columns;
CREATE POLICY "Owners and editors can manage columns" ON columns
  FOR ALL 
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- Tasks Policies
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and editors can manage tasks" ON tasks;
CREATE POLICY "Owners and editors can manage tasks" ON tasks
  FOR ALL 
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- 5. Triggers & Functions
-- Function to handle new user registration
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

-- Trigger to call handle_new_user on sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Function to handle new project initialization
CREATE OR REPLACE FUNCTION handle_new_project() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create the mandatory 'Archived' column
  INSERT INTO public.columns (project_id, title, color, position, is_archive_pool)
  VALUES (new.id, 'Archived', 'zinc', 0, true);

  -- 2. Add the creator as the owner in project_members
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (new.id, new.user_id, 'owner');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_project on project creation
DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE PROCEDURE handle_new_project();

-- 6. Real-time Setup
-- Enable real-time for ALL relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- 7. Data Helpers & Maintenance (Self-Upgrading)
DO $$ 
BEGIN
    -- Add project_id to tasks if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='project_id') THEN
        ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
        
        -- Backfill project_id
        UPDATE public.tasks t
        SET project_id = c.project_id
        FROM public.columns c
        WHERE t.column_id = c.id;
        
        ALTER TABLE public.tasks ALTER COLUMN project_id SET NOT NULL;
    END IF;

    -- Add title to tasks if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='title') THEN
        ALTER TABLE public.tasks ADD COLUMN title TEXT;
    END IF;
END $$;

-- a. Ensure all project owners are added as 'owner' members
INSERT INTO project_members (project_id, user_id, role)
SELECT id, user_id, 'owner'
FROM projects
ON CONFLICT (project_id, user_id) DO NOTHING;

-- b. Cleanup duplicate archive pools (keeps the oldest one)
DELETE FROM columns a
USING columns b
WHERE a.id > b.id
  AND a.project_id = b.project_id
  AND a.is_archive_pool = true
  AND b.is_archive_pool = true;
