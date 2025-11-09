-- Update teams table RLS policies to support team user authentication
-- Teams can now be accessed by:
-- 1. The admin who created the team (created_by = auth.uid())
-- 2. The team user account itself (auth_user_id = auth.uid())

-- Drop existing policies on teams table
DROP POLICY IF EXISTS "Teams can be viewed by anyone." ON teams;
DROP POLICY IF EXISTS "Teams can be created by authenticated users." ON teams;
DROP POLICY IF EXISTS "Teams can be updated by their creator." ON teams;
DROP POLICY IF EXISTS "Teams can be deleted by their creator." ON teams;

-- CREATE: Only authenticated users can create teams
CREATE POLICY "Teams can be created by authenticated users." ON teams
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- SELECT: Team creators or team users can view teams
CREATE POLICY "Teams can be viewed by creator or team user." ON teams
  FOR SELECT
  USING (auth.uid() = created_by OR auth.uid() = auth_user_id);

-- UPDATE: Team creators can update teams
CREATE POLICY "Teams can be updated by their creator." ON teams
  FOR UPDATE
  USING (auth.uid() = created_by);

-- DELETE: Team creators can delete teams
CREATE POLICY "Teams can be deleted by their creator." ON teams
  FOR DELETE
  USING (auth.uid() = created_by);

-- Update participants RLS policies to allow team users to access their team's participants
-- Drop and recreate participants policies
DROP POLICY IF EXISTS "Participants can be viewed by team members." ON participants;
DROP POLICY IF EXISTS "Participants can be created by team members." ON participants;
DROP POLICY IF EXISTS "Participants can be updated by team members." ON participants;
DROP POLICY IF EXISTS "Participants can be deleted by team members." ON participants;

-- SELECT: Team creators or team users can view participants
CREATE POLICY "Participants can be viewed by team creator or team user." ON participants
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND (created_by = auth.uid() OR auth_user_id = auth.uid()))
  );

-- INSERT: Team creators can create participants
CREATE POLICY "Participants can be created by team creator." ON participants
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
  );

-- UPDATE: Team creators can update participants
CREATE POLICY "Participants can be updated by team creator." ON participants
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
  );

-- DELETE: Team creators can delete participants
CREATE POLICY "Participants can be deleted by team creator." ON participants
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
  );

-- Update matches RLS policies to allow team users to access their team's matches
-- Drop existing match policies (if they exist)
DROP POLICY IF EXISTS "Matches can be viewed by team members or creator." ON matches;
DROP POLICY IF EXISTS "Matches can be created by team members or creator." ON matches;
DROP POLICY IF EXISTS "Matches can be updated by team members or creator." ON matches;
DROP POLICY IF EXISTS "Matches can be deleted by team members or creator." ON matches;

-- SELECT: Team creators, team users, or tournament creators can view matches
CREATE POLICY "Matches can be viewed by team/tournament members." ON matches
  FOR SELECT
  USING (
    -- Team creator or team user
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND (teams.created_by = auth.uid() OR teams.auth_user_id = auth.uid())
    )
    -- OR tournament creator
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- INSERT: Team creators or tournament creators can create matches
CREATE POLICY "Matches can be created by team/tournament members." ON matches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND teams.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- UPDATE: Team creators or tournament creators can update matches
CREATE POLICY "Matches can be updated by team/tournament members." ON matches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND teams.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND teams.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- DELETE: Team creators or tournament creators can delete matches
CREATE POLICY "Matches can be deleted by team/tournament members." ON matches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND teams.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );
