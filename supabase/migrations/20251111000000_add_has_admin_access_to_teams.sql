-- Add has_admin_access column to teams table
-- This column controls whether a team has access to admin/management screens

ALTER TABLE teams ADD COLUMN IF NOT EXISTS has_admin_access BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN teams.has_admin_access IS 'Whether this team has access to admin/management features. Used for operational support by teams.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teams_has_admin_access ON teams(has_admin_access) WHERE has_admin_access = TRUE;
