-- Backfill project_members for existing projects
-- Adds the project owner as an 'owner' member for every existing project
INSERT INTO project_members (project_id, user_id, role)
SELECT id, user_id, 'owner'
FROM projects
ON CONFLICT (project_id, user_id) DO NOTHING;
