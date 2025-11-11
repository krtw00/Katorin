-- Create a template/reference for the Staff Team
-- This is NOT inserted automatically, but serves as documentation and reference
-- Admins should manually create the staff team per tournament using this template

-- Template for creating a Staff Team:
--
-- The Staff Team is a special team used for operational support.
-- Team members added to the Staff Team can access admin features via has_admin_access=true.
--
-- To create a Staff Team for a tournament:
--
-- 1. Use the team creation API with the following details:
--    - Name (Japanese): 運営チーム
--    - Name (English): Staff Team
--    - has_admin_access: true (set after creation)
--
-- 2. After creation, update the team to grant admin access:
--    UPDATE teams SET has_admin_access = true WHERE name = '運営チーム' AND tournament_id = '<tournament-id>';
--
-- 3. Add staff members as participants to this team
--    They will inherit admin access from the team's has_admin_access flag

-- Add a comment to the teams table for documentation
COMMENT ON COLUMN teams.has_admin_access IS
'Whether this team has access to admin/management features. Typically set to true for Staff Team (運営チーム/Staff Team) to allow operational support personnel to access admin screens.';
