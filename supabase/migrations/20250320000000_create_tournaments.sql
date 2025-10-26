-- Supabase CLI migration
-- 大会情報を管理するテーブルを作成します

create extension if not exists "pgcrypto";

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tournaments_slug_key on public.tournaments (lower(slug));
