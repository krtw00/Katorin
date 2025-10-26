# Katorin 開発メモ

このリポジトリでは Supabase をデータストアとして利用し、`/api/matches` 経由でフロントエンドと連携します。ローカル Supabase を使った開発手順を以下にまとめます。

## 必要なツール

- Node.js 18 以上
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)（Docker が必要）

## 初期セットアップ

```bash
npm install
npm install --prefix frontend
```

## Supabase の起動と環境変数

1. Supabase を起動します。
   ```bash
   supabase start
   ```
   初回起動時に `supabase/.env` が生成され、Anon キーなどが記載されます。

2. API サーバーは `.env.local` → `.env` → `supabase/.env` の順番で環境変数を読み込みます。最も簡単なのは生成されたファイルをそのままコピーする方法です。
   ```bash
   cp supabase/.env .env.local
   ```

3. 手動で設定する場合は最低限以下 2 つを定義してください。
   ```env
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=（supabase/.env に記載の anon キー）
   ```

4. 認証付きのフロントエンドを利用するため、`frontend/.env.local` にも以下の環境変数を設定してください。
   ```env
   REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
   REACT_APP_SUPABASE_ANON_KEY=（supabase/.env に記載の anon キー）
   ```
   `frontend/.env.local` は存在しない場合に作成してください。

   ※ 選択状態を共有したい補助的な用途として、`REACT_APP_DEFAULT_TOURNAMENT_ID` / `REACT_APP_DEFAULT_ROUND_ID` を定義すると、対戦表作成ツールなど補助画面がその大会・ラウンドを初期値として読み込みます（任意）。

5. 運営アカウントの作成 API を利用する場合は、ルート直下の `.env.local`（API 用）に `SUPABASE_SERVICE_ROLE_KEY` も設定してください。
   ```env
   SUPABASE_SERVICE_ROLE_KEY=（supabase/.env に記載の service_role キー）
   ```

## データベーススキーマ

`supabase/migrations/20250305000000_create_matches.sql` に対戦記録テーブル、`supabase/migrations/20250320000000_create_tournaments.sql` に大会テーブルを作成するマイグレーションを用意しています。

```bash
supabase db push
```

テーブルは以下のカラムを持ちます。

- `team`, `player`, `deck`
- `selfScore`, `opponentScore`
- `opponentTeam`, `opponentPlayer`, `opponentDeck`
- `date`（日付）

これらのカラム名はフロントエンドから送信される JSON のキー（キャメルケース）と一致しています。

大会テーブル（`tournaments`）は以下のカラムを持ちます。

- `name`（大会名）
- `slug`（半角英数とハイフンで構成される大会コード）
- `description`（任意の説明文）
- `created_by`（作成した Supabase ユーザー ID）
- `created_at`（作成日時）

## ローカル開発の起動

バックエンド(API)とフロントエンドを同時に立ち上げ、コード保存時に自動リロードされます。

```bash
# 両方まとめて起動（API:3001 / Frontend:3000）
npm run dev

# どちらか片方だけ起動したい場合
npm run dev:api        # nodemon で API をホットリロード
npm run dev:frontend   # CRA 開発サーバー
```

フロントエンドは `package.json` の `proxy` 設定によりポート 3001 の API へリクエストを転送します。

## API エンドポイント

- `GET /api/matches`  
  対戦記録を新しい日付順で取得します。
- `POST /api/matches`  
  1 件の対戦記録を登録します。
- `PUT /api/matches/:id`  
  指定 ID の対戦記録を更新します。
- `DELETE /api/matches/:id`  
  指定 ID の対戦記録を削除します。
- `GET /api/tournaments`  
  大会一覧を取得します（認証不要）。
- `POST /api/tournaments`  
  大会を作成します（管理者のみ）。
- `GET /api/tournaments/:tournamentId/rounds`  
  指定した大会のラウンドを番号順に取得します。
- `POST /api/tournaments/:tournamentId/rounds`  
  新しいラウンドを作成します（管理者のみ）。直前のラウンドが締め済みである必要があります。
- `POST /api/tournaments/:tournamentId/rounds/:roundId/close`  
  指定したラウンドを締めます（管理者のみ）。
- `POST /api/tournaments/:tournamentId/rounds/:roundId/reopen`  
  最新の締め済みラウンドを再開します（管理者のみ）。後続ラウンドが存在する場合は再開できません。
- `POST /api/admin/users`  
  新しい運営アカウント（管理者ロール付きの Supabase ユーザー）を作成します。`SERVICE ROLE KEY` が設定されている必要があります。

エラーが発生した場合はレスポンスにメッセージが含まれ、サーバーログにも詳細が出力されます。

> ℹ️ 全ての `/api/matches` エンドポイントは Supabase 認証トークン（`Authorization: Bearer ...`）が必須です。さらに `GET /api/matches` では `tournamentId`（必要に応じて `roundId`）のクエリパラメータを指定してください。`POST /api/matches` や `PUT /api/matches/:id` の際は本文に `tournamentId` と `roundId` を含める必要があります。
> 大会やラウンドの作成・締め操作（`POST /api/tournaments*`）、および管理者アカウント作成 (`POST /api/admin/users`) も同様に認証が必須で、Supabase ユーザーの `app_metadata.role` に `admin` が含まれている必要があります。

## 管理者・参加者アカウントの運用

- 管理者アカウントは Supabase Auth のユーザーに対してメールアドレス＋パスワードでサインインします。Supabase Studio の「Authentication → Users」で対象ユーザーの App Metadata に `{"role": "admin"}`（または `{"roles": ["admin"]}`）を設定してください。
- 参加者アカウントを管理者が作成する場合は、Supabase の Service Role キーを使って疑似メールアドレス（例: `username@{tournament-slug}.players.local`）でユーザーを作成し、App Metadata に `{"role": "player", "tournament": "{tournament-slug}"}` などを付与します。ログイン画面は大会コードとユーザー名からこの疑似メールアドレスを組み立てて Supabase Auth にサインインする想定です。
- 大会コード（スラッグ）は参加者メールのドメインとして使用されるため、半角英数字とハイフンのみを利用してください。フロントエンドの管理者用 UI から大会を作成できます。

## 大会の選択フロー（管理者）

1. 管理者でログインすると、最初に大会選択画面が表示されます。
2. 既存の大会を選択するか、「大会を作成」ボタンから新しく大会を登録すると、その大会が選択状態になり、対戦管理ツールへ遷移します。
3. 画面右上の「大会を変更」ボタンから、いつでも別の大会に切り替えられます。
4. 大会を追加した直後は自動的にその大会が選択されます。必要に応じて右上のボタンから再度大会一覧に戻ってください。
5. 同じヘッダーから「運営アカウント追加」を押すと、メールアドレスとパスワードを指定して新しい管理者アカウントを作成できます（SERVICE ROLE KEY が必要）。

## ラウンド管理

- 各大会には「第 n 回戦」としてラウンドを作成できます。ラウンドは常に最新のみが「進行中」となり、締め処理を行うと次のラウンドを作成できるようになります。
- 対戦カードは必ずいずれかのラウンドに属します。管理画面からラウンドを選択することで、そのラウンドに紐づく対戦だけが表示され、対戦の新規作成も進行中のラウンドのみに限定されます。
- 最新ラウンドを締めたあとでも、後続のラウンドが無ければ「このラウンドを再開」ボタンから締めを解除できます。次のラウンドを追加すると、直前のラウンドは再開できなくなります。
- 対戦カードは各カード右上のアイコンから編集・削除できます。編集ダイアログでチーム名・日付を修正し、削除ダイアログで内容を確認してから削除を確定してください。
- 運営以外の画面では参加者向け機能を今後追加予定です。現状では管理者ロールでログインしたユーザーのみがラウンド作成・締め・再開を実行できます。
