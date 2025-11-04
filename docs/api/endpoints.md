# API Endpoints (Authoritative)

認証: 原則 `Authorization: Bearer <supabase_jwt>` が必要。管理系は `app_metadata.role=admin` を要求。

## Matches
- GET /api/matches
  - Query: `tournamentId` (必須), `roundId` (任意)
  - 200: 配列（新しい日付順）
  - 401/403: 認証/権限エラー
  - Example:
    ```bash
    curl -H "Authorization: Bearer $TOKEN" \
      "http://localhost:3001/api/matches?tournamentId=xxx&roundId=yyy"
    ```

- POST /api/matches
  - Body: `team, player, deck, selfScore, opponentScore, opponentTeam, opponentPlayer, opponentDeck, date, tournamentId, roundId`
  - 201: 作成
  - 400: バリデーション
  - 401/403: 認証/権限

- PUT /api/matches/:id
  - Body: 上記のサブセット
  - 200: 更新結果
  - 404: 未存在

- DELETE /api/matches/:id
  - 204: 削除
  - 404: 未存在

## Tournaments
- GET /api/tournaments
  - 公開エンドポイント（認証不要）
- POST /api/tournaments (admin)
  - Body: `name, slug, description?`

## Rounds
- GET /api/tournaments/:tournamentId/rounds
- POST /api/tournaments/:tournamentId/rounds (admin)
  - 直前ラウンドが締め済みであることが前提
- POST /api/tournaments/:tournamentId/rounds/:roundId/close (admin)
- POST /api/tournaments/:tournamentId/rounds/:roundId/reopen (admin, latest closed only)

## Admin
- POST /api/admin/users (admin)
  - Service Role Key がサーバに設定されていること

## Auth Utilities
- POST /api/password-reset
  - Body: `email`
  - ローカル: Mailpit (http://127.0.0.1:54324) で確認

## エラーフォーマット
- { message: string, code?: string, details?: any }
