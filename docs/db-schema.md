# Database Schema (Overview)

マイグレーションは `supabase/migrations/` に格納。主要テーブル:

- tournaments: id, name, slug (unique), description, created_by, created_at
- rounds: id, tournament_id, number, status('open'|'closed'), created_at
- matches: id, tournament_id, round_id, team, player, deck,
  selfScore, opponentScore, opponentTeam, opponentPlayer, opponentDeck, date,
  input_allowed_team_id text, result_status text default 'draft',
  locked_by text, locked_at timestamptz, finalized_at timestamptz

代表的なインデックス（例）:
- matches_result_status_idx(result_status)
- matches_locked_by_idx(locked_by)
- matches_input_allowed_idx(input_allowed_team_id)

将来対応:
- ER 図を追補（DBML/SQL 生成から画像化）
