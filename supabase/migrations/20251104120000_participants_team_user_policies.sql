-- Participants RLS for team users (auth.uid() = teams.auth_user_id)
-- This migration adds policies allowing team users to manage their own team's participants.

do $$ begin
  create policy participants_select_by_team_user
    on participants
    for select
    using (
      exists (
        select 1 from teams t
        where t.id = participants.team_id
          and t.auth_user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy participants_insert_by_team_user
    on participants
    for insert
    with check (
      exists (
        select 1 from teams t
        where t.id = participants.team_id
          and t.auth_user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy participants_update_by_team_user
    on participants
    for update
    using (
      exists (
        select 1 from teams t
        where t.id = participants.team_id
          and t.auth_user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from teams t
        where t.id = participants.team_id
          and t.auth_user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy participants_delete_by_team_user
    on participants
    for delete
    using (
      exists (
        select 1 from teams t
        where t.id = participants.team_id
          and t.auth_user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;


