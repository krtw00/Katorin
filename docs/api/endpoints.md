# API Endpoints (Complete Reference)

このドキュメントは、Katorin APIのすべてのエンドポイントを網羅的に記載しています。

## 認証について

- ほとんどのエンドポイントで認証が必要です (`Authorization: Bearer <supabase_jwt>` ヘッダー)。
- 認証されたユーザー情報は `req.user` に格納されます。
- **`requireAuth`**: JWTを検証し、認証済みでなければ `401` を返します。
- **`requireAdmin`**: `app_metadata.role` が `admin` であることを要求します。
- **`requireAdminOrEditor`**: 管理者、または `teams` テーブルの `has_admin_access` が `true` のチームユーザーを許可します。
- **`attachTeam`**: 認証済みユーザー (`req.user`) に紐づくチーム情報を `teams` テーブルから取得し、`req.team` に格納します。

## 目次

1. [認証 (Authentication)](#認証-authentication)
2. [チーム管理 (Team Management)](#チーム管理-team-management)
3. [参加者管理 (Participant Management)](#参加者管理-participant-management)
4. [試合管理 (Match Management)](#試合管理-match-management)
5. [トーナメント管理 (Tournament Management)](#トーナメント管理-tournament-management)
6. [ラウンド管理 (Round Management)](#ラウンド管理-round-management)

---

## 認証 (Authentication)

### GET /api/team/me
現在認証されているチームユーザーに紐付くチームの完全な情報を取得します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "チーム名",
  "username": "team_username",
  "auth_user_id": "uuid",
  "tournament_id": "uuid",
  "has_admin_access": false,
  "created_by": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

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
  "message": "パスワードリセットのリンクを生成しました。"
}
```

---

## チーム管理 (Team Management)

### POST /api/teams/register
新しいチームを登録し、関連するSupabase Authユーザーを作成します。

**認証**: 必須 (`requireAuth`)

**リクエストボディ**:
```json
{
  "name": "チーム名",
  "tournament_slug": "tournament-slug"
}
```

**レスポンス (201)**:
```json
{
  "id": "uuid",
  "name": "チーム名",
  "username": "team-name",
  "created_at": "timestamp",
  "tournament_id": "uuid",
  "tournament_slug": "tournament-slug",
  "generatedPassword": "randomly_generated_password"
}
```
**注意**: `generatedPassword` はこのレスポンスでのみ返されます。クライアント側で安全に処理する必要があります。

### POST /api/teams/login
**[廃止]** このエンドポイントは廃止されました。
クライアントはSupabase Authの `signInWithPassword` を直接使用してください。
メールの形式は `{username}@{tournamentSlug}.players.local` です。

### GET /api/teams
指定されたトーナメントに属するチームの一覧を取得します。

**認証**: 必須 (`requireAuth`)

**クエリパラメータ**:
- `tournament_slug` または `tournament_id` (どちらか必須)

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "name": "チーム名",
    "username": "team_username",
    "created_at": "timestamp",
    "tournament_id": "uuid",
    "tournament_slug": "tournament-slug"
  }
]
```

### GET /api/teams/:id
指定されたIDのチーム情報を取得します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "チーム名",
  "username": "team_username",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### PUT /api/teams/:id
チーム情報を更新します。チーム名を変更すると、関連するAuthユーザーのメールも更新されます。

**認証**: 必須 (`requireAuth`)

**リクエストボディ**:
```json
{
  "name": "新しいチーム名"
}
```

**レスポンス (200)**:
```json
{
  "id": "uuid",
  "name": "新しいチーム名",
  "username": "new-team-name",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### DELETE /api/teams/:id
チームを削除します。関連するSupabase Authユーザーも同時に削除されます。

**認証**: 必須 (`requireAuth`)

**レスポンス (204)**: No Content

### GET /api/teams/export
チームデータをCSV形式でエクスポートします。

**認証**: 必須 (`requireAuth`)

**クエリパラメータ**:
- `tournament_slug` または `tournament_id` (どちらか必須)

**レスポンス (200)**: CSVファイル

### POST /api/teams/import
CSVファイルからチームデータをインポートします。

**認証**: 必須 (`requireAuth`)

**リクエスト**: `multipart/form-data`
- `file`: CSVファイル
- `tournament_slug`: トーナメントのスラッグ

**レスポンス (200)**:
```json
{
  "message": "10件のチームをインポートしました。",
  "imported": [
    {
      "id": "uuid",
      "name": "インポートされたチーム",
      "username": "imported-team",
      "generatedPassword": "random_password"
    }
  ],
  "errors": []
}
```

---

## 参加者管理 (Participant Management)

### Team Self-Service Endpoints
認証されたチームが自身の参加者を管理します。

#### GET /api/team/participants
認証されたチームの参加者一覧を取得します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**レスポンス (200)**:
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "name": "参加者名",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### POST /api/team/participants
認証されたチームに参加者を追加します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

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
  "team_id": "uuid",
  "name": "参加者名",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### PUT /api/team/participants/:id
参加者情報を更新します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**レスポンス (200)**: 更新された参加者情報

#### DELETE /api/team/participants/:id
参加者を削除します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**レスポンス (204)**: No Content

### Admin Endpoints
管理者が特定のチームの参加者を管理します。

#### GET /api/admin/teams/:teamId/participants
管理者が指定チームの参加者を取得します。

**認証**: 必須 (`requireAuth`, `requireAdminOrEditor`)

**レスポンス (200)**: 参加者の配列

#### POST /api/admin/teams/:teamId/participants
管理者が指定チームに参加者を追加します。

**認証**: 必須 (`requireAuth`, `requireAdminOrEditor`)

**レスポンス (201)**: 作成された参加者情報

#### PUT /api/admin/participants/:id
管理者が参加者情報を更新します。

**認証**: 必須 (`requireAuth`, `requireAdminOrEditor`)

**レスポンス (200)**: 更新された参加者情報

#### DELETE /api/admin/participants/:id
管理者が参加者を削除します。

**認証**: 必須 (`requireAuth`, `requireAdminOrEditor`)

**レスポンス (204)**: No Content

---

## 試合管理 (Match Management)

### Admin Endpoints

#### GET /api/matches
トーナメントの全試合一覧を取得します。

**認証**: 必須 (`requireAuth`)

**クエリパラメータ**:
- `tournamentId` (必須)
- `roundId` (任意)

**レスポンス (200)**: 試合情報の配列

#### GET /api/matches/completed
全トーナメントの完了済み試合一覧をページネーション付きで取得します。

**認証**: 必須 (`requireAuth`)

**クエリパラメータ**:
- `page`, `pageSize`, `search`, `tournamentId`, `dateFrom`, `dateTo`

**レスポンス (200)**:
```json
{
  "data": [],
  "total": 100,
  "page": 1,
  "pageSize": 25
}
```

#### GET /api/matches/:id
IDで指定された試合情報を取得します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**: 試合情報

#### POST /api/matches
新しい試合を作成します。

**認証**: 必須 (`requireAuth`)

**レスポンス (201)**: 作成された試合情報

#### PUT /api/matches/:id
試合情報を更新します。

**認証**: 必須 (`requireAuth`)

**レスポンス (200)**: 更新された試合情報

#### DELETE /api/matches/:id
試合を削除します。

**認証**: 必須 (`requireAuth`)

**レスポンス (204)**: No Content

### Team Self-Service Endpoints

#### GET /api/team/matches
認証されたチームの試合一覧を取得します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**クエリパラメータ**:
- `status`: `open` (デフォルト), `finalized`, `all`
- `limit`: 取得件数

**レスポンス (200)**: 試合情報の配列

#### POST /api/team/matches
認証されたチームの試合を作成します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**レスポンス (201)**: 作成された試合情報

#### PUT /api/team/matches/:id
認証されたチームが試合情報を更新します（確定前のみ）。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**レスポンス (200)**: 更新された試合情報

#### POST /api/team/matches/:id/result
試合結果の入力、確定、またはロック解除を行います。

**認証**: 必須 (`requireAuth`, `attachTeam`)

**リクエストボディ**:
```json
{
  "action": "save" | "finalize" | "cancel",
  "payload": { ...試合情報のフィールド... }
}
```
- **`save`**: ドラフトとして保存し、編集ロックをかけます。
- **`finalize`**: 結果を最終確定します。
- **`cancel`**: 編集ロックを解除します。

**レスポンス (200)**: 更新された試合情報

#### DELETE /api/team/matches/:id
認証されたチームが試合を削除します。

**認証**: 必須 (`requireAuth`, `attachTeam`)

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