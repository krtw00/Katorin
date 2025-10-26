-- Add tournaments <> matches relationship and introduce rounds.

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  number integer not null,
  title text,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz
);

create unique index if not exists rounds_tournament_number_key on public.rounds (tournament_id, number);

alter table public.matches
  add column if not exists tournament_id uuid references public.tournaments(id) on delete set null,
  add column if not exists round_id uuid references public.rounds(id) on delete set null;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.rounds to authenticated;

alter table public.rounds enable row level security;

drop policy if exists "Allow authenticated read rounds" on public.rounds;
create policy "Allow authenticated read rounds"
on public.rounds
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated insert rounds" on public.rounds;
create policy "Allow authenticated insert rounds"
on public.rounds
for insert
to authenticated
with check (true);

drop policy if exists "Allow authenticated update rounds" on public.rounds;
create policy "Allow authenticated update rounds"
on public.rounds
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated delete rounds" on public.rounds;
create policy "Allow authenticated delete rounds"
on public.rounds
for delete
to authenticated
using (true);
