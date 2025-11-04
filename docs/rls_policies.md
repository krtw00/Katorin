# RLS Policies

原則:
- admin: 全データ読書/作成/更新/削除可
- player: 自チーム/自大会に関わるレコードのみアクセス

matches の追加列（`20251104090000_add_result_input_permissions.sql`）:
- input_allowed_team_id: 入力許可（NULL=不可, 'admin'=管理者のみ, その他=チームID）
- result_status: 'draft' | 'submitted' | 'finalized'（将来拡張）
- locked_by / locked_at: 入力ロック
- finalized_at: 確定日時

推奨ポリシー例（擬似）:
- SELECT:
  - admin: true
  - player: row.tournament_id IN player_accessible_tournaments()
- INSERT/UPDATE:
  - admin: true
  - player: row.input_allowed_team_id = current_player_team_id() AND row.result_status = 'draft'
- DELETE:
  - admin: true
  - player: false

注意:
- Supabase Auth の `app_metadata.role` で admin 判定
- チーム/大会の関連は専用ビューや SECURITY DEFINER 関数で判定する
