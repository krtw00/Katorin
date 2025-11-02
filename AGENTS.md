# Repository Guidelines

## プロジェクト構成とモジュール整理
このモノレポは実行環境ごとに役割を分離しています。Express ベースの API は `api/` にあり、ミドルウェアや Supabase ヘルパー、HTTP エントリーポイントの `server.js` がまとまっています。React + TypeScript のクライアントは `frontend/` 配下で、機能別モジュールは `src/admin`、`src/auth`、`src/team` に整理され、共通コンポーネントは `src/components` と `src/lib` に配置します。バージョン管理された SQL と RLS 設定は `supabase/migrations`、設計メモや運用ノートは `docs/` に保管します。CI 用の `vercel.json` や `nodemon.json` など運用系設定はリポジトリ直下にまとめ、デプロイ参照を一元化します。ローカル用シークレットは `.env` または `supabase/.env` に置き、`supabaseClient.js` が自動で読み込みます。

## ビルド・テスト・開発コマンド
- `npm install` — ルートで依存関係を初期セットアップ。`frontend/` 側も自動で解決されます。
- `npm run dev` — API (ポート3001) とフロント (ポート3000) を同時に起動しホットリロード。
- `npm run dev:api` — `nodemon` で Express サーバーを監視。
- `npm run dev:frontend` — `frontend/` 配下で React Dev Server を起動。
- `npm run build --prefix frontend` — 本番用のビルド成果物を生成。
- `npm test --prefix frontend` — Jest + React Testing Library のテストを実行。
- `npm run i18n:csv-to-json --prefix frontend` — CSV ソースからロケール JSON を再生成。

## コーディングスタイルと命名規則
UI では TypeScript、API ではモダンな ES 構文を使用します。インデントは 2 スペース、コンポーネントは `PascalCase` ファイル名、関数やフックは `camelCase` で統一します。フック中心の関数コンポーネントを優先し、`src/locales` と `src/i18n.ts` のキーを常に同期させます。スタイルは必要に応じて `App.css` など既存のグローバル CSS を再利用し、複雑な UI は `MUI` コンポーネントのテーマガイドラインに沿って整理します。コミット前には `react-scripts` 由来の ESLint ルールでフォーマットを確認し、`api/` のユーティリティは単一責務のモジュールとしてエクスポートしてください。

## テスト指針
Jest のテストは実装ファイルの近く（例: `Component.test.tsx`）に配置し、React Testing Library のユーザー視点クエリで振る舞いを検証します。Supabase への依存は可能な限りモックし、テスト用フィクスチャは `__mocks__` で共有します。API 変更時は認証フローや CSV インポート／エクスポートを対象とした統合テストを追加するか、手動検証手順を PR に記録してレビュアーが追従できるようにします。クリティカルなロジックには `npm test -- --coverage` でカバレッジを確認し、閾値を下げる必要がある場合は理由を説明してください。

## コミットとプルリクエストのガイドライン
コミットは Git 履歴に倣い `feat`、`chore`、`docs` などのプレフィックスを付け、単一目的で命令形に保ちます。PR では概要、関連 Issue、UI 変更時のスクリーンショット、検証に使用したコマンドを必ず記載してください。Supabase のマイグレーションやスキーマ変更は明示し、`api/` と `frontend/` の双方に影響する場合は担当メンバーへレビューを依頼します。作業途中は Draft PR を活用し、レビュー準備が整ったら Ready for review に切り替えてください。

## ブランチ運用
`main` は常にデプロイ可能な状態を維持し、作業は機能単位の短命ブランチで進めます。命名は `feature/<概要>`、`fix/<概要>`、`chore/<概要>` を基本にし、Issue 番号がある場合は `feature/123-login-ui` のように接頭辞へ連結してください。1 ブランチにつき 1 つの課題に集中し、レビュー後は Fast-forward でマージするか、Squash して履歴を簡潔に保ちます。古いブランチはマージ後すぐに削除し、コンフリクト防止のために定期的に `main` をリベースしてください。

## Supabase と環境設定のヒント
API を起動する前に `SUPABASE_URL`、`SUPABASE_ANON_KEY`、必要に応じて `SUPABASE_SERVICE_ROLE_KEY` をローカルの `.env` に設定します。Supabase CLI を使ってタイムスタンプ付きマイグレーションを `supabase/migrations` に生成し、デプロイ先にも同じシークレットを配布します。サービスロールキーは信頼できる環境に限定し、バージョン管理には含めないでください。Vercel へデプロイする際は Environment Variables に同じキーを登録し、`npm run build --prefix frontend` の結果が安定していることを確認してからリリースしましょう。
