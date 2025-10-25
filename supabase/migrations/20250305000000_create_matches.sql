-- Supabase CLI migration
-- 対戦記録を保存するテーブルを作成します

create extension if not exists "pgcrypto";

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  "team" text,
  "player" text,
  "deck" text,
  "selfScore" text,
  "opponentScore" text,
  "opponentTeam" text,
  "opponentPlayer" text,
  "opponentDeck" text,
  "date" date,
  created_at timestamptz not null default timezone('utc', now())
);
