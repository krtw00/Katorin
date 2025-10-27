
-- Create teams table
CREATE TABLE teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams can be viewed by anyone." ON teams FOR SELECT USING (true);
CREATE POLICY "Teams can be created by authenticated users." ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Teams can be updated by their creator." ON teams FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Teams can be deleted by their creator." ON teams FOR DELETE USING (auth.uid() = created_by);

-- Create participants table
CREATE TABLE participants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    can_edit boolean DEFAULT FALSE,
    created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can be viewed by team members." ON participants FOR SELECT USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Participants can be created by team members." ON participants FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Participants can be updated by team members." ON participants FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Participants can be deleted by team members." ON participants FOR DELETE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND created_by = auth.uid())
);

-- Add team_id to matches table
ALTER TABLE matches
ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- Update RLS policies for matches to allow team members to view/create/update/delete their matches
-- Existing policies might need to be dropped and recreated or altered depending on their current state.
-- For simplicity, assuming new policies are added or existing ones are compatible.
-- If there are conflicting policies, this might require manual adjustment or more complex ALTER POLICY statements.

-- Drop existing policies if they conflict or need to be replaced
-- Example: DROP POLICY IF EXISTS "Matches can be viewed by authenticated users." ON matches;

-- Add new policies for team-based access
CREATE POLICY "Matches can be viewed by team members or creator." ON matches FOR SELECT USING (
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

CREATE POLICY "Matches can be created by team members or creator." ON matches FOR INSERT WITH CHECK (
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

CREATE POLICY "Matches can be updated by team members or creator." ON matches FOR UPDATE USING (
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

CREATE POLICY "Matches can be deleted by team members or creator." ON matches FOR DELETE USING (
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
