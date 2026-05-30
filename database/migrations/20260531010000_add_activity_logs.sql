CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_created_at ON project_activities(created_at DESC);

ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities of their projects" ON project_activities
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

CREATE OR REPLACE FUNCTION log_project_activity() RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  v_entity_id UUID;
  v_details JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_TABLE_NAME = 'projects' THEN
    v_project_id := COALESCE(NEW.id, OLD.id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSE
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_details := jsonb_build_object('new', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_details := jsonb_build_object('old', row_to_json(OLD));
  END IF;

  INSERT INTO public.project_activities (project_id, user_id, action_type, entity_type, entity_id, details)
  VALUES (v_project_id, v_user_id, TG_OP, TG_TABLE_NAME, v_entity_id, v_details);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_tasks_activity ON tasks;
CREATE TRIGGER log_tasks_activity
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE PROCEDURE log_project_activity();

DROP TRIGGER IF EXISTS log_columns_activity ON columns;
CREATE TRIGGER log_columns_activity
  AFTER INSERT OR UPDATE OR DELETE ON columns
  FOR EACH ROW EXECUTE PROCEDURE log_project_activity();

DROP TRIGGER IF EXISTS log_projects_activity ON projects;
CREATE TRIGGER log_projects_activity
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE PROCEDURE log_project_activity();

DROP TRIGGER IF EXISTS log_project_members_activity ON project_members;
CREATE TRIGGER log_project_members_activity
  AFTER INSERT OR UPDATE OR DELETE ON project_members
  FOR EACH ROW EXECUTE PROCEDURE log_project_activity();

-- Enable realtime for project_activities
ALTER PUBLICATION supabase_realtime ADD TABLE project_activities;
