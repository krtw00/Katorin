-- Remove can_edit column from participants table
-- This column is no longer needed as team-level permissions (teams.has_admin_access) are now used

-- First, drop policies that depend on can_edit column
DROP POLICY IF EXISTS matches_insert_by_team_editor ON public.matches;
DROP POLICY IF EXISTS matches_update_by_team_editor ON public.matches;
DROP POLICY IF EXISTS matches_delete_by_team_editor ON public.matches;

-- Recreate policies using teams.has_admin_access instead of participants.can_edit
CREATE POLICY matches_insert_by_team_editor
  ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = matches.team_id
        AND t.auth_user_id = auth.uid()
        AND t.has_admin_access = true
    )
  );

CREATE POLICY matches_update_by_team_editor
  ON public.matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = matches.team_id
        AND t.auth_user_id = auth.uid()
        AND t.has_admin_access = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = matches.team_id
        AND t.auth_user_id = auth.uid()
        AND t.has_admin_access = true
    )
  );

CREATE POLICY matches_delete_by_team_editor
  ON public.matches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = matches.team_id
        AND t.auth_user_id = auth.uid()
        AND t.has_admin_access = true
    )
  );

-- Now drop the column
ALTER TABLE participants DROP COLUMN IF EXISTS can_edit;

-- Add comment for documentation
COMMENT ON TABLE participants IS 'Team participants. All team members can edit team data. Admin access is controlled at team level via teams.has_admin_access.';
