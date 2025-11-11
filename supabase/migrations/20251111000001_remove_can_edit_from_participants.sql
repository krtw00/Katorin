-- Remove can_edit column from participants table
-- This column is no longer needed as team-level permissions (teams.has_admin_access) are now used

-- Drop the column
ALTER TABLE participants DROP COLUMN IF EXISTS can_edit;

-- Add comment for documentation
COMMENT ON TABLE participants IS 'Team participants. All team members can edit team data. Admin access is controlled at team level via teams.has_admin_access.';
