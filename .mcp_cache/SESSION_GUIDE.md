## [役割]
管理者は大会の作成・選択、ラウンド締めや再開、参加者アカウント発行を担い、運営アカウント権限を付与して体制を整える（README.md#大会の作成と選択管理者、docs/admin_workflows.md#管理者ワークフロー）。チーム代表や参加者は発行された大会コードとユーザー名でログインし、許可された場合に試合結果入力と確認を行う（docs/player_workflows.md#参加者ワークフロー）。開発者はAPIとフロントエンドの分離構造を理解し、各モジュールを責務ごとに保守することで迅速な改善を支える（AGENTS.md#プロジェクト構成とモジュール整理、docs/architecture.md#4-2-フロントエンドアーキテクチャ）。

## [禁則]
UI文言を直書きせず必ず翻訳キーを通し、多言語不整合やハードコーディングを禁じる（docs/coding-conventions.md#7-3-ハードコーディングの禁止、docs/coding-conventions.md#7-4-複数形・変数の対応）。環境変数は`.env`系で管理し、フロントへ公開して良い値のみ`VITE_`接頭辞を付け、サービスロールキーをクライアントへ渡さない（docs/coding-conventions.md#8-2-環境変数・シークレット）。XSS・CSRF・RLSの防御策を外す行為は禁止で、Supabase制御とセキュリティ方針を常に維持する（docs/coding-conventions.md#8-3-xss対策、docs/coding-conventions.md#6-2-row-level-security-rls）。

## [命名]
コンポーネントファイルはPascalCase、ユーティリティはcamelCaseまたはkebab-caseとし、変数・関数は意味の通るcamelCase、定数はUPPER_SNAKE_CASEで統一する（docs/coding-conventions.md#3-2-ファイル名、docs/coding-conventions.md#3-3-変数名・関数名）。Reactコンポーネントはフック中心で構成し、共有UIは`src/components`、共通ロジックは`src/lib`へ配置して役割を明確にする（AGENTS.md#プロジェクト構成とモジュール整理、docs/architecture.md#4-2-フロントエンドアーキテクチャ）。i18nキーは`src/locales`と`src/i18n.ts`を常に同期させ、命名規則から逸脱しない（AGENTS.md#コーディングスタイルと命名規則）。

## [規約]
ブランチは課題単位の短命運用とし、`feature/<概要>`等で命名、`main`は常にデプロイ可能な状態を維持する（AGENTS.md#ブランチ運用）。コミットは`feat`等のプレフィックスを付けた命令形でまとめ、PRでは概要・関連Issue・UI変更のスクリーンショット・検証コマンドを必ず添える（AGENTS.md#コミットとプルリクエストのガイドライン）。開発中はESLintとReact Testing Libraryを基準に、Supabase依存をモックしてテストし、必要に応じて手動検証手順を文書化する（AGENTS.md#テスト指針、docs/testing_guidelines.md#2-2-テスト目標）。

## [設計]
構成はVercel上のReactフロントとExpress APIがSupabaseのAuth/PostgreSQL/Realtimeへ接続する三層で、HTTPS経路と役割分担を守る（docs/architecture.md#4-1-全体構成）。フロントは`src/admin`・`src/auth`・`src/team`に機能分割し、共通基盤を`components`と`lib`に集約、バックエンドでは単一責務モジュールでAPIとユーティリティを整理する（docs/architecture.md#4-2-フロントエンドアーキテクチャ、AGENTS.md#プロジェクト構成とモジュール整理）。Supabaseのテーブル・RLS・マイグレーションは`supabase/migrations`でバージョン管理し、変更時は設計書に沿って反映する（AGENTS.md#プロジェクト構成とモジュール整理、docs/architecture.md#5-3-マイグレーション管理）。

## [完了条件]
最低限`npm test --prefix frontend`と必要なカバレッジ計測をローカルで通し、Supabase連携を含む変更ではモック方針と手動検証を報告する（docs/testing_guidelines.md#9-1-ローカル実行、AGENTS.md#テスト指針）。Vercelと同条件で`npm run build --prefix frontend`を成功させ、失敗例は原因と対処を記録する（AGENTS.md#ビルド・テスト・開発コマンド）。Supabaseマイグレーションや環境変数の更新はPRで明示し、レビューコメントに検証コマンドと影響範囲を列挙してから完了とみなす（AGENTS.md#コミットとプルリクエストのガイドライン、docs/deployment.md#5-3-環境変数の設定）。
