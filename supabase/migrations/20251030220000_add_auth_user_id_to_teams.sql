ALTER TABLE public.teams
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.teams.auth_user_id IS 'Supabase Auth user ID for team-specific authentication';
