# Katorin

## 概要

Katorinは、トーナメント運営を効率化するための管理システムです。リーグ戦やデュエル形式の対戦を管理し、チームや参加者の登録、試合結果の入力、リアルタイムでの順位表示などを提供します。大会運営者が複雑な大会進行をスムーズに管理できるように設計されています。

## 機能

- **ユーザー認証**: 管理者とチームの2つの認証方式に対応。安全なログイン、新規登録、パスワードリセット機能を提供します。
- **トーナメント管理**: 大会の作成、編集、削除、大会コード（スラッグ）による識別。
- **ラウンド管理**: 各大会内でラウンド（回戦）を作成し、ラウンドごとに対戦を管理。締め処理により次のラウンドへ進行。
- **チーム・参加者管理**: チームの登録、参加者の追加・編集・削除、疑似メールアドレスによる参加者アカウント管理。
- **対戦記録の管理**: 各ラウンドに紐づく対戦カードの作成、編集、削除、結果の入力。
- **リアルタイム更新**: Supabase Realtimeを活用し、対戦結果や順位表をリアルタイムで反映。
- **多言語対応**: 日本語と英語に対応（react-i18next）。
- **対戦表作成ツール**: 補助画面から対戦表を作成し、効率的にマッチングを生成。

## 技術スタック

### フロントエンド

- **言語**: TypeScript
- **フレームワーク**: React 18
- **UIライブラリ**: Material-UI (MUI)
- **ビルドツール**: Vite
- **国際化**: react-i18next
- **状態管理**: React Context API + Hooks
- **テスト**: Vitest, React Testing Library

### バックエンド

- **BaaS**: Supabase
  - **認証**: Supabase Auth
  - **データベース**: PostgreSQL (Supabaseホスティング)
  - **ストレージ**: Supabase Storage (将来的に使用予定)
  - **Edge Functions**: Deno (将来的に使用予定)
  - **リアルタイム**: Supabase Realtime
- **API**: Express.js (Node.js)

### インフラ

- **ホスティング**: Vercel (フロントエンド), Vercel Serverless Functions (API)
- **CI/CD**: GitHub Actions (将来的に導入予定)
- **バージョン管理**: Git (GitHub)

## 開発環境のセットアップ

### 前提条件

- Node.js 18 以上
- npm
- Docker (Supabase CLI を使用するために必要)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Step 1: プロジェクトのクローン

```bash
git clone https://github.com/your-organization/Katorin.git
cd Katorin
```

### Step 2: 依存関係のインストール

```bash
# バックエンド（API）の依存関係
npm install

# フロントエンドの依存関係
npm install --prefix frontend
```

### Step 3: Supabase のセットアップ

1. **Supabase をローカルで起動**

   Docker を起動した状態で、以下のコマンドを実行します。

   ```bash
   npx supabase start
   ```

   起動すると、API URL や各種キーが標準出力に表示されます:

   ```
   API URL: http://127.0.0.1:54321
   Publishable key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service Role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Studio URL: http://127.0.0.1:54323
   ```

2. **環境変数の設定**

   プロジェクトルートに `.env.local` を作成し、バックエンド API 用の環境変数を設定します。

   ```bash
   # .env.local
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
   PASSWORD_RESET_REDIRECT_URL=http://localhost:3000/password-reset
   ```

   フロントエンド用の環境変数を設定します。`frontend/.env.local` を作成してください。

   ```bash
   # frontend/.env.local
   REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   ```

   **注意**: 上記のキーはローカル開発環境用のデフォルト値です。`npx supabase start` の出力に表示される値を使用してください。

3. **データベースマイグレーションの実行**

   Supabase のローカル環境にデータベーススキーマを適用します。

   ```bash
   npx supabase db reset
   ```

### Step 4: アプリケーションの起動

バックエンド API とフロントエンドを同時に起動します。

```bash
# 両方まとめて起動（API:3001 / Frontend:3000）
npm run dev

# どちらか片方だけ起動したい場合
npm run dev:api        # nodemon で API をホットリロード
npm run dev:frontend   # React 開発サーバー
```

### Step 5: 動作確認

開発サーバーが起動したら、以下の URL にアクセスして動作を確認してください。

- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:3001
- **Supabase Studio**: http://127.0.0.1:54323 (データベース管理画面)
- **Mailpit (メール確認)**: http://127.0.0.1:54324 (パスワードリセットメールなどを確認)

### 開発環境の停止

Supabase を停止する際は、以下のコマンドを実行します。

```bash
npx supabase stop
```

## 初期データの準備

### ダミーデータの作成（開発・テスト用）

開発やテストのために、サンプルのダミーデータを一括で作成できます。

```bash
npm run seed:dummy
```

このコマンドを実行すると、以下のデータが自動生成されます:

- **1つの大会** (テスト大会 2025)
- **5〜8個のチーム** (ランダムな数)
- **各チームに3〜5人の参加者** (ランダムな数)
- **15〜30個の対戦** (ランダムな数、チーム間でランダムにマッチング)

**注意**: このスクリプトを実行するには、`.env.local`（またはsupabase/.env）に`SUPABASE_SERVICE_ROLE_KEY`が設定されている必要があります。

### 管理者アカウントの作成

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

または、フロントエンドの管理者画面から **運営アカウント追加** を使用して作成することもできます（`SUPABASE_SERVICE_ROLE_KEY` が必要）。

### 参加者アカウントの管理

- **管理者アカウント**: Supabase Auth のユーザーに対してメールアドレス＋パスワードでサインインします。
- **参加者アカウント**: 管理者が疑似メールアドレス（例: `username@{tournament-slug}.players.local`）でユーザーを作成し、App Metadata に `{"role": "player", "tournament": "{tournament-slug}"}` を付与します。
- **大会コード（スラッグ）**: 参加者メールのドメインとして使用されるため、半角英数字とハイフンのみを利用してください。

## 使い方

### 大会の作成と選択（管理者）

1. 管理者でログインすると、最初に大会選択画面が表示されます。
2. 既存の大会を選択するか、**大会を作成** ボタンから新しく大会を登録します。
3. 大会を選択すると、対戦管理ツールへ遷移します。
4. 画面右上の **大会を変更** ボタンから、いつでも別の大会に切り替えられます。

### ラウンド管理

- 各大会には「第 n 回戦」としてラウンドを作成できます。
- ラウンドは常に最新のみが「進行中」となり、締め処理を行うと次のラウンドを作成できるようになります。
- 対戦カードは必ずいずれかのラウンドに属し、管理画面からラウンドを選択することで、そのラウンドに紐づく対戦だけが表示されます。
- 最新ラウンドを締めたあとでも、後続のラウンドが無ければ **このラウンドを再開** ボタンから締めを解除できます。

### 対戦カードの管理

- 対戦カードは各カード右上のアイコンから編集・削除できます。
- 編集ダイアログでチーム名・日付を修正し、削除ダイアログで内容を確認してから削除を確定してください。

## Git運用ルール

本プロジェクトでは、`main`ブランチの安定性を確保しつつ、効率的に並行開発を進めるため、`develop`ブランチを導入したブランチ戦略を採用します。

- **`main`**: 常に本番環境にデプロイ可能な、最も安定したブランチです。
- **`develop`**: 次期リリースに向けた開発の統合ブランチです。機能開発はこちらのブランチを基点に行います。
- **フィーチャーブランチ**: 新機能の開発やバグ修正は、`develop`ブランチから `feature/your-feature` や `fix/login-error` のような名前でブランチを作成して行います。作業完了後、`develop`ブランチへのプルリクエストを作成してください。

コミットメッセージの規約など、より詳細なルールについては、[コーディング規約](docs/coding-conventions.md)を参照してください。

## 開発ガイドライン

本プロジェクトにおける開発の進め方やルールについては、以下のドキュメントを参照してください。

- **[環境構築ガイド](docs/environment-setup.md)**: 詳細な環境構築手順とトラブルシューティング。
- **[コーディング規約](docs/coding-conventions.md)**: フォーマット、命名規則、開発フローなど、コードを記述する際の規約を記載しています。
- **[アーキテクチャ設計書](docs/architecture.md)**: システム全体の設計、技術スタック、データベース設計について記載しています。
- **[テストガイドライン](docs/testing_guidelines.md)**: テスト戦略、テストフレームワーク、テストのベストプラクティスについて説明します。

## デプロイ

本アプリケーションのデプロイ手順については、[デプロイ手順書](docs/deployment.md) を参照してください。

- **フロントエンド**: Vercel
- **バックエンド（API）**: Vercel Serverless Functions
- **データベース**: Supabase (本番環境)
- **認証**: Supabase Auth

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細については [LICENSE](LICENSE) ファイルを参照してください。
