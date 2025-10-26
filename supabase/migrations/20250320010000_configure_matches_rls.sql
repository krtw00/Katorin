-- Ensure authenticated users can interact with matches table under RLS.

grant usage on schema public to authenticated;

grant
  select,
  insert,
  update,
  delete
on public.matches to authenticated;

alter table public.matches enable row level security;

drop policy if exists "Allow authenticated read matches" on public.matches;
create policy "Allow authenticated read matches"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated insert matches" on public.matches;
create policy "Allow authenticated insert matches"
on public.matches
for insert
to authenticated
with check (true);

drop policy if exists "Allow authenticated update matches" on public.matches;
create policy "Allow authenticated update matches"
on public.matches
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated delete matches" on public.matches;
create policy "Allow authenticated delete matches"
on public.matches
for delete
to authenticated
using (true);
