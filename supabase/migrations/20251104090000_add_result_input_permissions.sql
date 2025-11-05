-- Phase 2: Result input permission and locking for matches

-- 入力許可: NULL=入力不可, 'admin'=管理者のみ常時可, その他=チームID(uuid)文字列
alter table public.matches
  add column if not exists input_allowed_team_id text;

-- 入力状態とロック
alter table public.matches
  add column if not exists result_status text not null default 'draft',
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists finalized_at timestamptz;

-- 簡易インデックス（ロック解放や集計で利用する可能性）
create index if not exists matches_result_status_idx on public.matches(result_status);
create index if not exists matches_locked_by_idx on public.matches(locked_by);
create index if not exists matches_input_allowed_idx on public.matches(input_allowed_team_id);


