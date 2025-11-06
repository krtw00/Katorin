# 環境構築ガイド

## 1. はじめに
このドキュメントは、Katorinの開発環境をセットアップするための手順を説明します。

## 2. 必要なツール

開発を始める前に、以下のツールをインストールしてください。

- **Node.js**: バージョン 18 以上
- **npm**: Node.js に同梱
- **Docker**: Supabase CLI を使用するために必要
- **Supabase CLI**: [公式ドキュメント](https://supabase.com/docs/guides/cli)を参照してインストール

### Supabase CLI のインストール

```bash
npm install -g supabase
```

または、Homebrewを使用する場合（macOS / Linux）:

```bash
brew install supabase/tap/supabase
```

## 3. プロジェクトのクローン

```bash
git clone https://github.com/your-organization/Katorin.git
cd Katorin
```

## 4. 依存関係のインストール

プロジェクトルートとフロントエンドの依存関係をインストールします。

```bash
# バックエンド（API）の依存関係
npm install

# フロントエンドの依存関係
npm install --prefix frontend
```

## 5. Supabase のセットアップ

### 5.1. ローカル Supabase の起動

Docker を起動した状態で、以下のコマンドを実行します。

```bash
npx supabase start
```

初回起動時は、必要な Docker イメージがダウンロードされるため、時間がかかる場合があります。

起動が完了すると、以下のような情報が表示されます:

```
API URL: http://127.0.0.1:54321
Publishable key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Secret key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Studio URL: http://127.0.0.1:54323
```

これらの情報は環境変数の設定に使用します。

### 5.2. Supabase の停止

開発作業が終わったら、以下のコマンドで Supabase を停止できます。

```bash
npx supabase stop
```

## 6. 環境変数の設定

### 6.1. バックエンド（API）の環境変数

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を記述します。

```bash
# .env.local

# Supabase 設定
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# パスワードリセット用
PASSWORD_RESET_REDIRECT_URL=http://localhost:3000/password-reset

# JWT Secret (REQUIRED for team authentication)
# セキュアなランダム文字列を生成: openssl rand -base64 32
JWT_SECRET=your-secure-jwt-secret-key-here

# CORS設定: 許可するオリジン（カンマ区切り）
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

**注意**: 上記の `SUPABASE_ANON_KEY` と `SUPABASE_SERVICE_ROLE_KEY` は、ローカル開発環境用のデフォルト値です。`npx supabase start` の出力に表示される値を使用してください。

### 6.2. フロントエンドの環境変数

`frontend` ディレクトリ内に `.env.local` ファイルを作成し、以下の内容を記述します。

```bash
# frontend/.env.local

# Supabase 設定
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# 補助画面で使用する大会・ラウンドのデフォルト値（任意）
# REACT_APP_DEFAULT_TOURNAMENT_ID=1
# REACT_APP_DEFAULT_ROUND_ID=1
```

**注意**: `REACT_APP_SUPABASE_ANON_KEY` も、`npx supabase start` の出力に表示される Publishable key を使用してください。

### 6.3. 環境変数ファイルの管理

`.env.local` ファイルは Git 追跡対象外です（`.gitignore` に含まれています）。

環境変数のサンプルは `.env.example` に記載されているので、参考にしてください。

## 7. データベースマイグレーション

Supabase のローカル環境にデータベーススキーマを適用します。

```bash
npx supabase db reset
```

または、マイグレーションファイルを個別に適用する場合:

```bash
npx supabase db push
```

これにより、`supabase/migrations/` ディレクトリ内のマイグレーションファイルが実行され、テーブルが作成されます。

## 8. 開発サーバーの起動

### 8.1. すべてのサービスを同時起動

バックエンド API とフロントエンドを同時に起動します。

```bash
npm run dev
```

このコマンドにより、以下のサーバーが起動します:

- **API**: http://localhost:3001
- **フロントエンド**: http://localhost:3000

### 8.2. 個別に起動

必要に応じて、個別に起動することもできます。

```bash
# API のみ起動
npm run dev:api

# フロントエンドのみ起動
npm run dev:frontend
```

## 9. アクセス先

開発サーバーが起動したら、以下の URL にアクセスできます。

- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:3001
- **Supabase Studio**: http://127.0.0.1:54323 (データベース管理画面)
- **Mailpit (メール確認)**: http://127.0.0.1:54324 (パスワードリセットメールなどを確認)

## 10. 初期データの準備

### 10.1. 管理者アカウントの作成

Supabase Studio (http://127.0.0.1:54323) にアクセスし、以下の手順で管理者アカウントを作成します。

1. **Authentication** → **Users** を開く
2. **Add user** をクリック
3. メールアドレスとパスワードを入力し、**Create user** をクリック
4. 作成したユーザーをクリックし、**App Metadata** に以下を追加:
   ```json
   {
     "role": "admin"
   }
   ```
5. **Save** をクリック

または、API エンドポイント `POST /api/admin/users` を使用して作成することもできます。

### 10.2. 大会の作成

フロントエンドにログインし、管理者画面から大会を作成します。

1. http://localhost:3000 にアクセス
2. 作成した管理者アカウントでログイン
3. **大会を作成** ボタンをクリック
4. 大会名と大会コード（半角英数字とハイフン）を入力
5. **作成** をクリック

## 11. パスワードリセット機能のテスト

ローカル開発環境では、パスワードリセットメールは実際には送信されず、Mailpit でキャッチされます。

1. ログイン画面で **パスワードをお忘れですか？** をクリック
2. メールアドレスを入力して **リセットリンクを送信** をクリック
3. Mailpit (http://127.0.0.1:54324) でメールを確認
4. メール内のリンクをクリックして新しいパスワードを設定

## 12. トラブルシューティング

### 12.1. Supabase が起動しない

- Docker が起動しているか確認してください。
- ポートが既に使用されていないか確認してください（54321, 54323, 54324 など）。
- Supabase CLI が最新版か確認してください: `supabase --version`

### 12.2. フロントエンドが起動しない

- Node.js のバージョンが 18 以上か確認してください: `node --version`
- `frontend/node_modules` を削除して、再度 `npm install --prefix frontend` を実行してください。

### 12.3. API が起動しない

- 環境変数が正しく設定されているか確認してください（`.env.local`）。
- ポート 3001 が既に使用されていないか確認してください。

### 12.4. データベース接続エラー

- Supabase が起動しているか確認してください: `npx supabase status`
- 環境変数の `SUPABASE_URL` が正しいか確認してください。

## 13. 次のステップ

環境構築が完了したら、以下のドキュメントを参照して開発を進めてください。

- [コーディング規約](./coding-conventions.md)
- [アーキテクチャ設計書](./architecture.md)
- [テストガイドライン](./testing_guidelines.md)
