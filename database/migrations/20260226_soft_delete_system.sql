-- Add archived_at to projects
ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Add archived_at and is_archive_pool to columns
ALTER TABLE columns ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE columns ADD COLUMN is_archive_pool BOOLEAN DEFAULT FALSE;

-- Add archived_at to tasks
ALTER TABLE tasks ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN previous_column_id UUID REFERENCES columns(id) ON DELETE SET NULL;

-- Indexing for performance
CREATE INDEX idx_projects_archived_at ON projects(archived_at);
CREATE INDEX idx_columns_archived_at ON columns(archived_at);
CREATE INDEX idx_tasks_archived_at ON tasks(archived_at);
CREATE INDEX idx_columns_is_archive_pool ON columns(is_archive_pool);
CREATE INDEX idx_tasks_previous_column_id ON tasks(previous_column_id);
