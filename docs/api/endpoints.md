# API Endpoints (Complete Reference)

このドキュメントは、Katorin APIのすべてのエンドポイントを網羅的に記載しています。

## 認証について

- ほとんどのエンドポイントで認証が必要です（`Authorization: Bearer <supabase_jwt>` ヘッダー）
- 管理者専用エンドポイントは `app_metadata.role=admin` が必要
- チーム専用エンドポイントはチームの認証トークンが必要

## 目次

1. [基本エンドポイント](#基本エンドポイント)
2. [チーム管理 (Team Management)](#チーム管理-team-management)
3. [参加者管理 (Participant Management)](#参加者管理-participant-management)
4. [試合管理 (Match Management)](#試合管理-match-management)
5. [トーナメント管理 (Tournament Management)](#トーナメント管理-tournament-management)
6. [ラウンド管理 (Round Management)](#ラウンド管理-round-management)
7. [管理者機能 (Admin Functions)](#管理者機能-admin-functions)
8. [認証ユーティリティ (Auth Utilities)](#認証ユーティリティ-auth-utilities)

---

## 基本エンドポイント

### GET /api
動作確認用のシンプルなエンドポイント。

**認証**: 不要

**レスポンス**:
```
Hello from Node.js backend!
```

---

## チーム管理 (Team Management)

### GET /api/team/me
現在認証されているユーザーに紐付くチーム情報を取得します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "チーム名",
  "username": "team_username"
}
```

**エラー**:
- `404`: チームが見つかりません

---

### GET /api/teams
すべてのチーム一覧を取得します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "name": "チーム名",
    "username": "team_username",
    "created_at": "timestamp"
  }
]
```

---

### GET /api/teams/:id
指定されたIDのチーム情報を取得します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: チームID (UUID)

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "チーム名",
  "username": "team_username",
  "created_at": "timestamp"
}
```

**エラー**:
- `404`: チームが見つかりません

---

### POST /api/teams/register
新しいチームを登録します（Supabase Auth連携）。

**認証**: 必須 (`requireAuth`)

**リクエストボディ**:
```json
{
  "name": "チーム名",
  "username": "team_username"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "name": "チーム名",
  "username": "team_username",
  "auth_user_id": "uuid"
}
```

**エラー**:
- `400`: バリデーションエラー
- `500`: チーム作成失敗

---

### POST /api/teams/login
チームのログイン（旧実装、廃止予定の可能性あり）。

**認証**: 不要

**リクエストボディ**:
```json
{
  "username": "team_username",
  "password": "password"
}
```

**レスポンス (200)**:
```json
{
  "token": "jwt_token",
  "team": {
    "id": "uuid",
    "name": "チーム名",
    "username": "team_username"
  }
}
```

---

### PUT /api/teams/:id
チーム情報を更新します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: チームID

**リクエストボディ**:
```json
{
  "name": "新しいチーム名",
  "username": "new_username"
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "新しいチーム名",
  "username": "new_username"
}
```

---

### DELETE /api/teams/:id
チームを削除します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: チームID

**レスポンス (204)**: No Content

**エラー**:
- `404`: チームが見つかりません

---

### GET /api/teams/export
チームデータをCSV形式でエクスポートします。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**:
```csv
id,name,username,created_at
uuid,チーム名,team_username,2025-01-01T00:00:00Z
```

---

### POST /api/teams/import
CSVファイルからチームデータをインポートします。

**認証**: 必須 (`requireAuth`)

**リクエスト**: `multipart/form-data`
- `file`: CSVファイル

**レスポンス (200)**:
```json
{
  "imported": 10,
  "errors": []
}
```

---

## 参加者管理 (Participant Management)

### GET /api/team/participants
認証されたチームの参加者一覧を取得します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "name": "参加者名",
    "can_edit": false,
    "created_at": "timestamp"
  }
]
```

---

### POST /api/team/participants
認証されたチームに参加者を追加します。

**認証**: 必須 (`requireAuth`)

**リクエストボディ**:
```json
{
  "name": "参加者名"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "name": "参加者名",
  "can_edit": false,
  "created_at": "timestamp"
}
```

---

### PUT /api/team/participants/:participantId
参加者情報を更新します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `participantId`: 参加者ID

**リクエストボディ**:
```json
{
  "name": "新しい参加者名"
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "新しい参加者名",
  "can_edit": false,
  "created_at": "timestamp"
}
```

---

### DELETE /api/team/participants/:participantId
参加者を削除します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `participantId`: 参加者ID

**レスポンス (204)**: No Content

---

### GET /api/teams/:teamId/participants
指定されたチームの参加者一覧を取得します（チーム認証版）。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `teamId`: チームID

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "name": "参加者名",
    "can_edit": true,
    "created_at": "timestamp"
  }
]
```

---

### POST /api/teams/:teamId/participants
指定されたチームに参加者を追加します（チーム認証版）。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `teamId`: チームID

**リクエストボディ**:
```json
{
  "name": "参加者名"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "name": "参加者名",
  "can_edit": true,
  "created_at": "timestamp"
}
```

---

### PUT /api/participants/:id
参加者情報を更新します（チーム認証版）。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `id`: 参加者ID

**リクエストボディ**:
```json
{
  "name": "新しい参加者名"
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "新しい参加者名"
}
```

---

### DELETE /api/participants/:id
参加者を削除します（チーム認証版）。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `id`: 参加者ID

**レスポンス (204)**: No Content

---

### GET /api/admin/teams/:teamId/participants
管理者が指定チームの参加者を取得します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `teamId`: チームID

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "name": "参加者名",
    "can_edit": true,
    "team_id": "uuid",
    "created_at": "timestamp"
  }
]
```

---

### POST /api/admin/teams/:teamId/participants
管理者が指定チームに参加者を追加します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `teamId`: チームID

**リクエストボディ**:
```json
{
  "name": "参加者名"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "name": "参加者名",
  "team_id": "uuid"
}
```

---

### PUT /api/admin/participants/:id
管理者が参加者情報を更新します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: 参加者ID

**リクエストボディ**:
```json
{
  "name": "新しい参加者名",
  "can_edit": true
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "新しい参加者名",
  "can_edit": true
}
```

---

### DELETE /api/admin/participants/:id
管理者が参加者を削除します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: 参加者ID

**レスポンス (204)**: No Content

---

## 試合管理 (Match Management)

### GET /api/matches
試合一覧を取得します。

**認証**: 必須 (`requireAuth`)

**クエリパラメータ**:
- `tournamentId` (必須): トーナメントID
- `roundId` (任意): ラウンドID

**例**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/matches?tournamentId=xxx&roundId=yyy"
```

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "team": "チーム名",
    "player": "プレイヤー名",
    "deck": "デッキ名",
    "selfScore": 2,
    "opponentScore": 1,
    "opponentTeam": "対戦相手チーム",
    "opponentPlayer": "対戦相手プレイヤー",
    "opponentDeck": "対戦相手デッキ",
    "date": "2025-01-01",
    "tournament_id": "uuid",
    "round_id": "uuid"
  }
]
```

**エラー**:
- `401/403`: 認証/権限エラー

---

### GET /api/matches/:id
指定されたIDの試合情報を取得します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: 試合ID

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "team": "チーム名",
  "player": "プレイヤー名",
  "deck": "デッキ名",
  "selfScore": 2,
  "opponentScore": 1,
  "date": "2025-01-01"
}
```

---

### POST /api/matches
新しい試合を作成します。

**認証**: 必須 (`requireAuth`)

**リクエストボディ**:
```json
{
  "team": "チーム名",
  "player": "プレイヤー名",
  "deck": "デッキ名",
  "selfScore": 2,
  "opponentScore": 1,
  "opponentTeam": "対戦相手チーム",
  "opponentPlayer": "対戦相手プレイヤー",
  "opponentDeck": "対戦相手デッキ",
  "date": "2025-01-01",
  "tournamentId": "uuid",
  "roundId": "uuid"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "team": "チーム名",
  ...
}
```

**エラー**:
- `400`: バリデーションエラー
- `401/403`: 認証/権限エラー

---

### PUT /api/matches/:id
試合情報を更新します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: 試合ID

**リクエストボディ**:
```json
{
  "team": "新しいチーム名",
  "selfScore": 3,
  "opponentScore": 0
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "team": "新しいチーム名",
  ...
}
```

**エラー**:
- `404`: 試合が見つかりません

---

### DELETE /api/matches/:id
試合を削除します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `id`: 試合ID

**レスポンス (204)**: No Content

**エラー**:
- `404`: 試合が見つかりません

---

### GET /api/team/matches
チーム認証版：チームの試合一覧を取得します。

**認証**: 必須 (`requireTeamAuth`)

**クエリパラメータ**:
- `tournamentId` (任意): トーナメントID
- `roundId` (任意): ラウンドID

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "team": "チーム名",
    "player": "プレイヤー名",
    ...
  }
]
```

---

### POST /api/team/matches
チーム認証版：試合を作成します。

**認証**: 必須 (`requireTeamAuth`)

**リクエストボディ**:
```json
{
  "player": "プレイヤー名",
  "deck": "デッキ名",
  "selfScore": 2,
  "opponentScore": 1,
  "opponentTeam": "対戦相手チーム",
  "opponentPlayer": "対戦相手プレイヤー",
  "opponentDeck": "対戦相手デッキ",
  "date": "2025-01-01"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  ...
}
```

---

### PUT /api/team/matches/:id
チーム認証版：試合情報を更新します。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `id`: 試合ID

**リクエストボディ**:
```json
{
  "selfScore": 3,
  "opponentScore": 0
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  ...
}
```

---

### POST /api/team/matches/:id/result
チーム認証版：試合結果を入力します。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `id`: 試合ID

**リクエストボディ**:
```json
{
  "selfScore": 2,
  "opponentScore": 1
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "selfScore": 2,
  "opponentScore": 1,
  "result_status": "finalized"
}
```

---

### DELETE /api/team/matches/:id
チーム認証版：試合を削除します。

**認証**: 必須 (`requireTeamAuth`)

**パラメータ**:
- `id`: 試合ID

**レスポンス (204)**: No Content

---

## トーナメント管理 (Tournament Management)

### GET /api/tournaments
トーナメント一覧を取得します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "name": "トーナメント名",
    "slug": "tournament-slug",
    "description": "説明",
    "created_at": "timestamp"
  }
]
```

---

### POST /api/tournaments
新しいトーナメントを作成します（管理者のみ）。

**認証**: 必須 (`requireAuth` + `requireAdmin`)

**リクエストボディ**:
```json
{
  "name": "トーナメント名",
  "slug": "tournament-slug",
  "description": "説明（任意）"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "name": "トーナメント名",
  "slug": "tournament-slug",
  "description": "説明",
  "created_by": "uuid"
}
```

**エラー**:
- `400`: バリデーションエラー
- `403`: 管理者権限が必要

---

## ラウンド管理 (Round Management)

### GET /api/tournaments/:tournamentId/rounds
指定されたトーナメントのラウンド一覧を取得します。

**認証**: 必須 (`requireAuth`)

**パラメータ**:
- `tournamentId`: トーナメントID

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "tournament_id": "uuid",
    "number": 1,
    "status": "open",
    "created_at": "timestamp"
  }
]
```

---

### POST /api/tournaments/:tournamentId/rounds
新しいラウンドを作成します（管理者のみ）。

**認証**: 必須 (`requireAuth` + `requireAdmin`)

**パラメータ**:
- `tournamentId`: トーナメントID

**注意**: 直前のラウンドが締め済み（`closed`）である必要があります。

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "tournament_id": "uuid",
  "number": 2,
  "status": "open"
}
```

**エラー**:
- `400`: 前回ラウンドが未締め
- `403`: 管理者権限が必要

---

### POST /api/tournaments/:tournamentId/rounds/:roundId/close
ラウンドを締めます（管理者のみ）。

**認証**: 必須 (`requireAuth` + `requireAdmin`)

**パラメータ**:
- `tournamentId`: トーナメントID
- `roundId`: ラウンドID

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "tournament_id": "uuid",
  "number": 1,
  "status": "closed"
}
```

---

### POST /api/tournaments/:tournamentId/rounds/:roundId/reopen
締めたラウンドを再開します（管理者のみ、最新の締めラウンドのみ）。

**認証**: 必須 (`requireAuth` + `requireAdmin`)

**パラメータ**:
- `tournamentId`: トーナメントID
- `roundId`: ラウンドID

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "tournament_id": "uuid",
  "number": 1,
  "status": "open"
}
```

**エラー**:
- `400`: 後続ラウンドが存在する場合は再開不可

---

## 管理者機能 (Admin Functions)

### POST /api/admin/users
管理者または参加者ユーザーを作成します（管理者のみ）。

**認証**: 不要（ただし、サーバー側で `SUPABASE_SERVICE_ROLE_KEY` が必要）

**リクエストボディ**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "admin"
}
```

**レスポンス (201)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "app_metadata": {
      "role": "admin"
    }
  }
}
```

**エラー**:
- `400`: バリデーションエラー
- `500`: ユーザー作成失敗

---

### POST /api/admin/users/:userId/reset-password
管理者が指定ユーザーのパスワードをリセットします（管理者のみ）。

**認証**: 必須 (`requireAuth` + `requireAdmin`)

**パラメータ**:
- `userId`: ユーザーID

**リクエストボディ**:
```json
{
  "newPassword": "new_password123"
}
```

**レスポンス (200)**:
```json
{
  "message": "パスワードがリセットされました"
}
```

---

## 認証ユーティリティ (Auth Utilities)

### POST /api/password-reset
パスワードリセットメールを送信します。

**認証**: 不要

**リクエストボディ**:
```json
{
  "email": "user@example.com"
}
```

**レスポンス (200)**:
```json
{
  "message": "パスワードリセットメールを送信しました"
}
```

**注意**:
- ローカル環境: Mailpit (http://127.0.0.1:54324) でメールを確認
- 本番環境: Supabase設定のSMTPサーバーから送信

---

## エラーフォーマット

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "message": "エラーメッセージ",
  "code": "ERROR_CODE",
  "details": {}
}
```

一般的なHTTPステータスコード：
- `200`: 成功
- `201`: 作成成功
- `204`: 削除成功（レスポンスボディなし）
- `400`: バリデーションエラー
- `401`: 認証エラー
- `403`: 権限エラー
- `404`: リソースが見つかりません
- `500`: サーバーエラー

---

## 使用例

### トーナメントと試合の作成フロー

```bash
# 1. ログイン（トークン取得は別途）
TOKEN="your_jwt_token"

# 2. トーナメント作成（管理者のみ）
curl -X POST http://localhost:3001/api/tournaments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "春季大会", "slug": "spring-2025"}'

# 3. ラウンド作成（管理者のみ）
curl -X POST http://localhost:3001/api/tournaments/{tournamentId}/rounds \
  -H "Authorization: Bearer $TOKEN"

# 4. 試合作成
curl -X POST http://localhost:3001/api/matches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team": "チームA",
    "player": "プレイヤー1",
    "deck": "デッキX",
    "selfScore": 2,
    "opponentScore": 1,
    "opponentTeam": "チームB",
    "opponentPlayer": "プレイヤー2",
    "opponentDeck": "デッキY",
    "date": "2025-01-15",
    "tournamentId": "{tournamentId}",
    "roundId": "{roundId}"
  }'

# 5. 試合一覧取得
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/matches?tournamentId={tournamentId}&roundId={roundId}"
```
