-- Fix for duplicate Archived columns
-- 1. Create a unique index to prevent multiple archive pools per project
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_archive_pool 
ON columns (project_id) 
WHERE is_archive_pool = true;

-- 2. Cleanup existing duplicates (keep only the first one created)
DELETE FROM columns a
USING columns b
WHERE a.id > b.id
  AND a.project_id = b.project_id
  AND a.is_archive_pool = true
  AND b.is_archive_pool = true;
