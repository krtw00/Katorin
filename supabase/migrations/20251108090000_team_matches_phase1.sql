-- Issue #33: Team match management groundwork
-- - Remove legacy deck columns
-- - Add timezone column
-- - Configure RLS for team users based on participants.can_edit

alter table public.matches
  drop column if exists "deck",
  drop column if exists "opponentDeck",
  add column if not exists timezone text;

-- Team-facing RLS policies
do $$
begin
  create policy matches_select_by_team_user
  on public.matches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.teams t
      where t.id = matches.team_id
        and t.auth_user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy matches_insert_by_team_editor
  on public.matches
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.teams t
      where t.id = matches.team_id
        and t.auth_user_id = auth.uid()
        and exists (
          select 1
          from public.participants p
          where p.team_id = matches.team_id
            and p.can_edit is true
        )
    )
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy matches_update_by_team_editor
  on public.matches
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.teams t
      where t.id = matches.team_id
        and t.auth_user_id = auth.uid()
        and exists (
          select 1
          from public.participants p
          where p.team_id = matches.team_id
            and p.can_edit is true
        )
    )
  )
  with check (
    exists (
      select 1
      from public.teams t
      where t.id = matches.team_id
        and t.auth_user_id = auth.uid()
        and exists (
          select 1
          from public.participants p
          where p.team_id = matches.team_id
            and p.can_edit is true
        )
    )
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy matches_delete_by_team_editor
  on public.matches
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.teams t
      where t.id = matches.team_id
        and t.auth_user_id = auth.uid()
        and exists (
          select 1
          from public.participants p
          where p.team_id = matches.team_id
            and p.can_edit is true
        )
    )
  );
exception
  when duplicate_object then null;
end;
$$;
