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

エラーが発生した場合はレスポンスにメッセージが含まれ、サーバーログにも詳細が出力されます。

> ℹ️ 全ての `/api/matches` エンドポイントは Supabase 認証トークン（`Authorization: Bearer ...`）が必須です。フロントエンドのログインに成功すると自動的に付与されます。
> `POST /api/tournaments` も同様に認証が必須で、さらに Supabase ユーザーの `app_metadata.role` に `admin` が含まれている必要があります。

## 管理者・参加者アカウントの運用

- 管理者アカウントは Supabase Auth のユーザーに対してメールアドレス＋パスワードでサインインします。Supabase Studio の「Authentication → Users」で対象ユーザーの App Metadata に `{"role": "admin"}`（または `{"roles": ["admin"]}`）を設定してください。
- 参加者アカウントを管理者が作成する場合は、Supabase の Service Role キーを使って疑似メールアドレス（例: `username@{tournament-slug}.players.local`）でユーザーを作成し、App Metadata に `{"role": "player", "tournament": "{tournament-slug}"}` などを付与します。ログイン画面は大会コードとユーザー名からこの疑似メールアドレスを組み立てて Supabase Auth にサインインする想定です。
- 大会コード（スラッグ）は参加者メールのドメインとして使用されるため、半角英数字とハイフンのみを利用してください。フロントエンドの管理者用 UI から大会を作成できます。

## 大会の選択フロー（管理者）

1. 管理者でログインすると、最初に大会選択画面が表示されます。
2. 既存の大会を選択するか、「大会を作成」ボタンから新しく大会を登録すると、その大会が選択状態になり、対戦管理ツールへ遷移します。
3. 画面右上の「大会を変更」ボタンから、いつでも別の大会に切り替えられます。
4. 大会を追加した直後は自動的にその大会が選択されます。必要に応じて右上のボタンから再度大会一覧に戻ってください。
