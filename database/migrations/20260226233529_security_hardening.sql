-- Hardening RLS policies to prevent project takeover and role escalation

-- 1. Tighten project updates: Editors can no longer change the project owner
DROP POLICY IF EXISTS "Owners and editors can update projects" ON projects;
CREATE POLICY "Owners and editors can update projects" ON projects
  FOR UPDATE 
  USING (auth.uid() = user_id OR is_project_admin(id, auth.uid()))
  WITH CHECK (
    auth.uid() = user_id OR -- Owners can update everything
    (is_project_admin(id, auth.uid()) AND user_id = get_project_owner(id)) -- Editors cannot change project owner
  );

-- 2. Restrict member management: Only owners can manage all members; editors can only invite viewers
DROP POLICY IF EXISTS "Owners and editors can manage project members" ON project_members;

CREATE POLICY "Owners can manage all project members" ON project_members
  FOR ALL 
  USING (get_project_owner(project_id) = auth.uid());

CREATE POLICY "Editors can invite viewers" ON project_members
  FOR INSERT
  WITH CHECK (is_project_admin(project_id, auth.uid()) AND role = 'viewer');
