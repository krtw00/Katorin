# 管理者ワークフロー

管理者がKatorinシステムで行う主要な操作と、関連するAPIエンドポイントの概要です。

## 1. 大会の準備

### 1.1. 管理者アカウントの作成
必要に応じて、`POST /api/admin/users` を使用して新しい管理者アカウントを作成します。
（この操作は通常、システム初期設定時に行われます）

### 1.2. トーナメントの作成
`POST /api/tournaments` を使用して、新しいトーナメントを作成します。
```json
{
  "name": "新しい大会",
  "slug": "new-tournament-2025"
}
```

## 2. チームと参加者の管理

### 2.1. チームの登録
管理者は、作成したトーナメントに参加するチームを登録します。
`POST /api/teams/register` を使用します。
```json
{
  "name": "チームA",
  "tournament_slug": "new-tournament-2025"
}
```
このAPIは、チーム用のログイン情報（ユーザー名と自動生成されたパスワード）を返します。管理者はこの情報を各チームに伝達する必要があります。

### 2.2. 参加者の管理
管理者は、各チームの参加者を直接追加・編集・削除できます。
- `GET /api/admin/teams/:teamId/participants`
- `POST /api/admin/teams/:teamId/participants`
- `PUT /api/admin/participants/:id`
- `DELETE /api/admin/participants/:id`

## 3. 大会の進行管理

### 3.1. ラウンドの作成と管理
`POST /api/tournaments/:tournamentId/rounds` を使用して、大会の最初のラウンドを作成します。
大会が進行したら、`POST /api/tournaments/:tournamentId/rounds/:roundId/close` を使用して現在のラウンドを締め、次のラウンドを作成します。

### 3.2. 試合結果の管理
- **直接編集**: 管理者は `PUT /api/matches/:id` を使用して、いつでも試合結果を修正できます。
- **入力許可**: `matches`テーブルの `input_allowed_team_id` を更新することで、特定のチームに結果の入力を許可できます。

## 4. ユーザーアカウントのメンテナンス

### パスワードリセット
チームからパスワード忘れの連絡があった場合、管理者は `POST /api/admin/users/:userId/reset-password` を使用して、対象チームのパスワードをリセットできます。
