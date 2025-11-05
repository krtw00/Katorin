# デプロイ手順

## 1. はじめに
このドキュメントは、Katorinを本番環境にデプロイするための手順を説明します。

## 2. デプロイ構成

Katorinは以下の環境にデプロイされます:

- **フロントエンド**: Vercel
- **バックエンド（API）**: Vercel Serverless Functions
- **データベース**: Supabase (本番環境)
- **認証**: Supabase Auth

## 3. 前提条件

デプロイを開始する前に、以下のアカウントを作成してください:

- [GitHub](https://github.com/) アカウント
- [Vercel](https://vercel.com/) アカウント
- [Supabase](https://supabase.com/) アカウント

## 4. Supabase（本番環境）のセットアップ

### 4.1. Supabase プロジェクトの作成

1. https://supabase.com/dashboard にアクセス
2. **New Project** をクリック
3. プロジェクト名、データベースパスワード、リージョンを入力
4. **Create new project** をクリック

プロジェクトの作成には数分かかります。

### 4.2. データベーススキーマの適用

ローカル開発環境から、本番環境にマイグレーションを適用します。

#### 4.2.1. Supabase CLI でログイン

```bash
npx supabase login
```

ブラウザが開くので、Supabase アカウントでログインします。

#### 4.2.2. Supabase プロジェクトにリンク

```bash
npx supabase link --project-ref <your-project-ref>
```

`<your-project-ref>` は、Supabase ダッシュボードの **Project Settings** → **General** で確認できます。

#### 4.2.3. マイグレーションを適用

```bash
npx supabase db push
```

これにより、`supabase/migrations/` 内のマイグレーションファイルが本番環境に適用されます。

### 4.3. Supabase の環境変数を取得

Supabase ダッシュボードで以下の情報を取得します。

1. **Project Settings** → **API** を開く
2. 以下の値をメモします:
   - **Project URL**: `https://<your-project-ref>.supabase.co`
   - **API Key (anon public)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **API Key (service_role)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (秘密情報)

## 5. Vercel へのデプロイ

### 5.1. Vercel プロジェクトの作成

1. https://vercel.com/dashboard にアクセス
2. **New Project** をクリック
3. GitHub リポジトリを選択 (Katorin)
4. **Import** をクリック

### 5.2. ビルド設定

Vercel のプロジェクト設定で、以下を設定します。

#### Framework Preset
- **Framework Preset**: Create React App

#### Root Directory
- **Root Directory**: `frontend` (フロントエンドのディレクトリ)

#### Build Command
- **Build Command**: `npm run build`

#### Output Directory
- **Output Directory**: `build`

### 5.3. 環境変数の設定

Vercel ダッシュボードで **Settings** → **Environment Variables** を開き、以下の環境変数を追加します。

#### フロントエンド用の環境変数

| Name | Value |
|------|-------|
| `REACT_APP_SUPABASE_URL` | Supabase の Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase の API Key (anon public) |

#### バックエンド（API）用の環境変数

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Supabase の Project URL |
| `SUPABASE_ANON_KEY` | Supabase の API Key (anon public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の API Key (service_role) |
| `PASSWORD_RESET_REDIRECT_URL` | `https://your-app-domain.vercel.app/password-reset` |

**注意**: `SUPABASE_SERVICE_ROLE_KEY` は秘密情報なので、安全に管理してください。

### 5.4. API ルートの設定

バックエンド API を Vercel Serverless Functions として動作させるため、`api/` ディレクトリを Vercel の API Routes として設定します。

プロジェクトルートに `vercel.json` を作成し、以下の内容を記述します:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

### 5.5. デプロイの実行

1. Vercel ダッシュボードで **Deploy** をクリック
2. ビルドとデプロイが完了するまで待機
3. デプロイが成功すると、URL が発行されます（例: `https://katorin.vercel.app`）

## 6. Supabase メール設定（パスワードリセット機能）

本番環境でパスワードリセット機能を使用するには、Supabase でメール送信を設定する必要があります。

### 6.1. Gmail を使用する場合

#### 6.1.1. Gmail でアプリパスワードを生成

1. https://myaccount.google.com/security にアクセス
2. **2段階認証プロセス** を有効化（まだの場合）
3. https://myaccount.google.com/apppasswords にアクセス
4. アプリ名（例: `Katorin`）を入力し、**作成** をクリック
5. **16桁のパスワード** が表示されるので、コピーして保存

#### 6.1.2. Supabase で SMTP を設定

1. Supabase ダッシュボードで **Project Settings** → **Authentication** → **SMTP Settings** を開く
2. 以下の情報を入力:

| フィールド | 値 |
|-----------|-----|
| **Enable Custom SMTP** | ON |
| **SMTP Host** | `smtp.gmail.com` |
| **SMTP Port** | `587` |
| **SMTP User** | あなたの Gmail アドレス |
| **SMTP Password** | 生成した16桁のアプリパスワード（スペース無し） |
| **Sender email** | あなたの Gmail アドレス |
| **Sender name** | `Katorin` |

3. **Save** をクリック

#### 6.1.3. Gmail の送信制限

Gmail の無料アカウントは、1日あたり500通までメールを送信できます。大規模な大会の場合は、専用のメールサービス（SendGrid、Resend、Amazon SES など）の利用を検討してください。

### 6.2. リダイレクト URL の設定

1. Supabase ダッシュボードで **Authentication** → **URL Configuration** を開く
2. **Redirect URLs** に以下を追加:
   - `https://your-app-domain.vercel.app/**`
   - `http://localhost:3000/**` (ローカル開発環境用)

3. **Save** をクリック

## 7. 管理者アカウントの作成

本番環境で管理者アカウントを作成します。

### 7.1. Supabase Studio で作成

1. Supabase ダッシュボードで **Authentication** → **Users** を開く
2. **Add user** をクリック
3. メールアドレスとパスワードを入力し、**Create user** をクリック
4. 作成したユーザーをクリックし、**App Metadata** に以下を追加:
   ```json
   {
     "role": "admin"
   }
   ```
5. **Save** をクリック

### 7.2. フロントエンドから作成（API 経由）

フロントエンドの管理者画面から、`POST /api/admin/users` エンドポイントを使用して作成することもできます。

**注意**: この方法を使用するには、`SUPABASE_SERVICE_ROLE_KEY` が環境変数に設定されている必要があります。

## 8. デプロイ後の確認

デプロイが完了したら、以下を確認してください:

1. **フロントエンドが表示されるか**
   - https://your-app-domain.vercel.app にアクセス
   - ログイン画面が表示されることを確認

2. **ログインできるか**
   - 作成した管理者アカウントでログイン
   - ダッシュボードが表示されることを確認

3. **API が動作するか**
   - 大会を作成できるか確認
   - ラウンドを作成できるか確認

4. **パスワードリセット機能が動作するか**
   - ログイン画面で「パスワードをお忘れですか？」をクリック
   - メールアドレスを入力してリセットリンクを送信
   - メールを確認し、リンクをクリックして新しいパスワードを設定

## 9. 継続的デプロイ (CI/CD)

Vercel は GitHub リポジトリと連携しており、以下のブランチへのプッシュで自動的にデプロイされます:

- **main ブランチ**: 本番環境にデプロイ
- **develop ブランチ**: プレビュー環境にデプロイ（任意）
- **フィーチャーブランチ**: プルリクエストごとにプレビュー環境が作成

### 9.1. GitHub Actions の設定（任意）

プッシュ時に自動的にテストを実行する場合は、`.github/workflows/ci.yml` を作成します。

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: |
          npm install
          npm install --prefix frontend
      - name: Run tests
        run: npm test --prefix frontend
```

## 10. ロールバック

デプロイに問題があった場合、Vercel ダッシュボードから以前のデプロイメントにロールバックできます。

1. Vercel ダッシュボードで **Deployments** を開く
2. ロールバックしたいデプロイメントを選択
3. **Promote to Production** をクリック

## 11. トラブルシューティング

### 11.1. ビルドエラー

- **エラー**: `Module not found`
  - **解決策**: `package.json` の依存関係を確認し、`npm install` を実行してください。

- **エラー**: `Environment variable not found`
  - **解決策**: Vercel の環境変数が正しく設定されているか確認してください。

### 11.2. API エラー

- **エラー**: `500 Internal Server Error`
  - **解決策**: Vercel のログを確認し、エラーメッセージを確認してください。

- **エラー**: `Supabase connection failed`
  - **解決策**: 環境変数の `SUPABASE_URL` と `SUPABASE_ANON_KEY` が正しいか確認してください。

### 11.3. メールが届かない

- **解決策**: Supabase の SMTP 設定を再確認してください。
- **解決策**: Gmail のアプリパスワードが正しいか確認してください。
- **解決策**: 迷惑メールフォルダを確認してください。

## 12. セキュリティに関する注意

- **環境変数**: `SUPABASE_SERVICE_ROLE_KEY` は秘密情報なので、Git にコミットしないでください。
- **HTTPS**: 本番環境では必ず HTTPS を使用してください（Vercel はデフォルトで HTTPS を使用）。
- **CORS**: 必要に応じて、API で CORS 設定を追加してください。
- **RLS ポリシー**: Supabase のテーブルには Row Level Security (RLS) を設定してください。

## 13. 次のステップ

デプロイが完了したら、以下を検討してください:

- **カスタムドメインの設定**: Vercel でカスタムドメインを設定
- **監視とログ**: Vercel Analytics や Sentry でエラーログを監視
- **バックアップ**: Supabase のバックアップ設定を確認
