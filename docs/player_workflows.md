# プレイヤー（チーム）ワークフロー

プレイヤー（チームアカウント）がKatorinシステムで行う主要な操作と、関連するAPIエンドポイントの概要です。

## 1. ログイン

管理者から提供された以下の情報を使用してログインします。
- トーナメントのスラッグ (例: `spring-cup-2025`)
- チームのユーザー名 (例: `team-phoenix`)
- チームのパスワード

クライアントアプリケーションは、これらの情報から `{username}@{tournamentSlug}.players.local` という形式のメールアドレスを内部的に生成し、Supabase Authの認証（`signInWithPassword`）を実行します。

## 2. チームメンバーの管理

ログイン後、チームは自身のチームに所属するプレイヤー（参加者）を管理できます。

- **一覧取得**: `GET /api/team/participants`
- **追加**: `POST /api/team/participants`
- **更新**: `PUT /api/team/participants/:id`
- **削除**: `DELETE /api/team/participants/:id`

## 3. 試合結果の入力

管理者が結果入力を許可した試合について、結果を入力・報告します。

- **入力対象の試合取得**: `GET /api/team/matches` を使用して、入力が必要な（未確定の）試合一覧を取得します。
- **結果の入力と確定**:
  - `POST /api/team/matches/:id/result` を使用します。
  - `action: 'save'` で下書き保存します。
  - `action: 'finalize'` で結果を最終確定します。
  - `action: 'cancel'` で編集中のロックを解除します。
- **権限**: `matches` レコードの `input_allowed_team_id` が自チームのIDと一致する場合のみ、操作が許可されます。

## 4. 試合結果の確認

- **自チームの試合結果**: `GET /api/team/matches` に `status=finalized` または `status=all` クエリパラメータを付けて、過去の試合結果を確認します。
- **大会全体の試合結果**: `GET /api/matches/completed` を使用して、トーナメントで完了したすべての試合結果を閲覧します。
