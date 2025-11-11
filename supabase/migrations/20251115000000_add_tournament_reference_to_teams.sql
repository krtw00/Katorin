-- Link teams to tournaments so that management can be scoped per event.

alter table public.teams
  add column if not exists tournament_id uuid references public.tournaments(id);

create index if not exists teams_tournament_id_idx
  on public.teams (tournament_id);

comment on column public.teams.tournament_id
  is 'Owning tournament id. Enables filtering teams per tournament.';
