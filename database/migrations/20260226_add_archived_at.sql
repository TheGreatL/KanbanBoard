-- Add archived_at to columns
ALTER TABLE columns ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Add archived_at to tasks
ALTER TABLE tasks ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Indexing for performance
CREATE INDEX idx_columns_archived_at ON columns(archived_at);
CREATE INDEX idx_tasks_archived_at ON tasks(archived_at);
