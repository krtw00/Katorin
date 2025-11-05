# コーディングルール（抽出版）

このドキュメントは、`README.md` および `docs/**` から抽出したKatorinプロジェクトのコーディングルールをまとめたものです。

## 1. 技術スタック

### フロントエンド
- **言語**: TypeScript
- **フレームワーク**: React 18/19 (Create React App / react-scripts)
- **UIライブラリ**: Material-UI (MUI) v7
- **ビルドツール**: Create React App (react-scripts)
- **ルーティング**: react-router-dom v7
- **国際化**: react-i18next
- **状態管理**: React Context API + Hooks
- **テスト**: Jest (CRA標準) + React Testing Library

### バックエンド
- **BaaS**: Supabase
  - **認証**: Supabase Auth
  - **データベース**: PostgreSQL
  - **ストレージ**: Supabase Storage (将来)
  - **Edge Functions**: Deno (将来)
  - **リアルタイム**: Supabase Realtime

### インフラ
- **ホスティング**: Vercel (フロントエンド)
- **CI/CD**: GitHub Actions
- **バージョン管理**: Git (GitHub)

## 2. 一般的なコーディング規約

### 2.1. インデント・フォーマット
- スペース2つを使用（タブ禁止）
- ESLint: `.eslintrc.cjs` に従い、警告・エラーはコミット前に修正
- Prettier: `.prettierrc` で自動整形、保存時自動フォーマット推奨
- EditorConfig: `.editorconfig` に従う

### 2.2. ファイル命名規則
- コンポーネントファイル: `PascalCase` (例: `LoginForm.tsx`)
- その他のファイル: `camelCase` または `kebab-case` (例: `useAuthorizedFetch.ts`, `auth-middleware.js`)

### 2.3. 変数・関数命名規則
- 変数名、関数名: `camelCase` で意味がわかるように命名
- 定数: `UPPER_SNAKE_CASE`

### 2.4. コメント
- コードの意図や複雑なロジックを説明
- JSDoc形式を推奨
- 「なぜ」を説明する（「何を」はコードから読み取れるため）

## 3. TypeScript

### 3.1. 型定義
- 明示的な型定義を積極的に使用
- `any` は極力避け、やむを得ない場合は `unknown` を検討
- `unknown` を使用する場合は型ガードで型を絞り込む
- **インターフェース vs 型エイリアス**:
  - オブジェクトの形状定義: `interface` を優先
  - Union型、Intersection型: `type` を使用
  - Propsや公開API: `interface` を使用（拡張可能性のため）
- 型アサーション (`as`) は最小限に抑える

### 3.2. 型定義ファイル
- すべての型定義は `types/` ディレクトリに集約

## 4. React / コンポーネント

### 4.1. コンポーネント設計
- 関数コンポーネントとHooksを使用
- 単一責任の原則に従い、小さく再利用可能な単位で作成
- propsの型定義はインターフェースまたは型エイリアスで明示的に行う

### 4.2. ディレクトリ構造
```
frontend/
├── src/
│   ├── admin/           # 管理者向けコンポーネント
│   ├── auth/            # 認証関連コンポーネント
│   ├── team/            # チーム向けコンポーネント
│   ├── components/      # 共通コンポーネント
│   ├── lib/             # ライブラリ (Supabaseクライアントなど)
│   ├── locales/         # 翻訳ファイル (i18n)
│   ├── types/           # TypeScript型定義
│   ├── App.tsx          # ルートコンポーネント
│   ├── i18n.ts          # i18n設定
│   └── index.tsx        # エントリーポイント
├── public/              # 静的ファイル
└── package.json
```

- **Feature-based**: 機能ごとにディレクトリを分割 (`admin/`, `auth/`, `team/`)
- **共通コンポーネント**: 複数の機能で使用するコンポーネントは `components/` に配置
- **型定義**: すべての型定義は `types/` ディレクトリに集約
- **ユーティリティ**: 共通関数は `lib/` または `utils/` に配置

### 4.3. Hooks
- カスタムHooksを作成し、ロジックの再利用性を高める
- カスタムHooksは `use` プレフィックスで始める (例: `useAuth`, `useLocalStorage`)
- `useEffect` の依存配列は正しく設定し、ESLintの警告を無視しない
- 無限ループを避けるため、依存配列には適切な値のみを含める

### 4.4. 状態管理
- **ローカル状態**: `useState`, `useReducer`
- **グローバル状態**: Context API (`AuthContext`, `AppContext`)
- **サーバー状態**: Supabase Realtime または React Query (検討中)
- **言語設定**: react-i18next

### 4.5. パフォーマンス最適化
- 不要な再レンダリングを避けるため、`React.memo`, `useMemo`, `useCallback` を適切に使用
- ただし、過度な最適化は避け、パフォーマンス問題が確認された場合に対応
- コード分割: `React.lazy()` でルートごとに分割
- 画像最適化: WebP形式、遅延ロード

## 5. Supabase / データベース

### 5.1. 認証
- Supabase Authを使用
- セッション管理は `@supabase/auth-helpers-react` を活用
- パスワードリセット、メール認証などの機能を適切に実装
- 認証トークンは安全に保管 (Supabaseが自動管理)

### 5.2. データベース

#### 5.2.1. スキーマ定義
- データベースのスキーマ変更は、必ずマイグレーションファイルを通じて行う
- マイグレーションファイルは `supabase/migrations/` ディレクトリに配置
- タイムスタンプ形式で管理: `YYYYMMDD_description.sql`
- マイグレーション作成: `npx supabase migration new <migration_name>`

#### 5.2.2. 主要テーブル
- **admins**: 管理者アカウント
- **teams**: チーム情報
- **tournaments**: トーナメント情報 (id, name, slug (unique), description, created_by, created_at)
- **rounds**: ラウンド情報 (id, tournament_id, number, status('open'|'closed'), created_at)
- **participants**: 参加者情報
- **matches**: 試合情報 (id, tournament_id, round_id, team, player, deck, selfScore, opponentScore, opponentTeam, opponentPlayer, opponentDeck, date, input_allowed_team_id, result_status default 'draft', locked_by, locked_at, finalized_at)
- **results**: 試合結果

#### 5.2.3. Row Level Security (RLS)
- すべてのテーブルにRLSポリシーを設定
- ポリシーは最小権限の原則に従い、必要最小限のアクセス権限を付与
- ユーザーは自分のデータのみアクセス可能
- 管理者は全データにアクセス可能

#### 5.2.4. クエリ
- Supabaseクライアントを使用して、型安全なクエリを作成
- クエリビルダーを使用し、生のSQLは避ける（やむを得ない場合を除く）
- エラーハンドリングを適切に行い、失敗時の処理を実装
- インデックス: 頻繁に検索されるカラムにインデックスを設定
- クエリ最適化: 必要なカラムのみ取得

#### 5.2.5. リアルタイム機能
- リアルタイム更新が必要な場合は、Supabase Realtime を使用
- 不要なサブスクリプションは適切にクリーンアップ (`useEffect` のクリーンアップ関数を使用)
- 必要な場合のみサブスクライブ

### 5.3. Edge Functions
- 複雑なビジネスロジックや外部API連携は、Supabase Edge Functions で実装
- Edge Functionsは Deno で記述
- エラーハンドリングを適切に行い、クライアントにわかりやすいエラーメッセージを返す

## 6. 国際化 (i18n)

### 6.1. サポート言語
- 日本語 (ja): デフォルト
- 英語 (en)

### 6.2. 翻訳ファイル
- `src/locales/ja/translation.json`
- `src/locales/en/translation.json`

### 6.3. 実装方針
- すべてのUIテキストは、react-i18next を使用して翻訳可能にする
- ハードコーディングの禁止: UIに表示するテキストは、直接コードに記述しない
- 必ず翻訳キーを使用: 例: `<Button>{t('common.submit')}</Button>`

### 6.4. 翻訳キーの命名規則
- キーは階層構造で記述 (例: `auth.login.title`, `errors.network`)
- キー名は英語で、内容を表す明確な名前を使用
- キー名には `camelCase` を使用

### 6.5. 複数形・変数の対応
- 数値による複数形の切り替えは、i18next の機能を使用
- 動的な値は、変数として渡す (例: `t('greeting', { name: userName })`)

## 7. セキュリティ

### 7.1. 認証・認可
- 認証はSupabase Authを使用し、独自実装は避ける
- 認証が必要なページは、認証ガードで保護
- **管理者**: すべての機能にアクセス可能
- **チーム**: 自分のチーム情報のみ閲覧・編集可能
- **未認証ユーザー**: 公開ページのみ閲覧可能

### 7.2. 環境変数・シークレット
- APIキー、パスワードなどは環境変数で管理
- `.env.local` ファイルはGit追跡対象外
- フロントエンド: CRAの慣習に従い `REACT_APP_` プレフィックス (例: `REACT_APP_SUPABASE_URL`)
- サーバーサイド: `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` など
- サービスロールキーなどの機密情報は、フロントエンドで使用しない
- GitHub Secrets で本番環境の変数を管理

### 7.3. XSS対策
- ユーザー入力は常にエスケープ
- `dangerouslySetInnerHTML` の使用は極力避ける（禁止）
- Reactのデフォルトのエスケープ機能を信頼

### 7.4. CSRF対策
- Supabase Authが提供するトークンベース認証を使用
- Cookie使用時は、SameSite属性を適切に設定

### 7.5. SQLインジェクション対策
- Supabaseクライアントのクエリビルダーを使用
- 生のSQLを使用する場合は、必ずパラメータ化

### 7.6. 依存関係の脆弱性管理
- `npm audit` を定期的に実行し、脆弱性をチェック
- 重大な脆弱性が見つかった場合は、速やかに対応

## 8. アクセシビリティ (a11y)

### 8.1. セマンティックHTML
- 意味のあるHTML要素を使用 (`<button>`, `<nav>`, `<main>` など)
- `<div>` や `<span>` の多用を避ける

### 8.2. ARIA属性
- 必要に応じてARIA属性を追加 (`aria-label`, `aria-describedby` など)
- ただし、セマンティックHTMLで代替できる場合は、そちらを優先

### 8.3. キーボードナビゲーション
- すべてのインタラクティブ要素は、キーボードで操作可能にする
- Tab キーでのフォーカス順序が論理的であることを確認
- フォーカス状態を視覚的に明確にする

### 8.4. カラーコントラスト
- WCAG 2.1 AA基準を満たすコントラスト比を維持
- 色だけで情報を伝えないようにする (アイコンやテキストも併用)

### 8.5. スクリーンリーダー対応
- 画像には適切な `alt` 属性を設定
- フォーム要素には `<label>` を関連付け
- エラーメッセージは、スクリーンリーダーで読み上げ可能にする

## 9. テスト

### 9.1. テスト方針
- **テストピラミッド**: 単体テスト (70%) > 結合テスト (25%) > E2Eテスト (5%)
- **カバレッジ目標**: 全体で70%以上、重要機能は90%以上
- **すべてのテストが高速**: 全テスト実行時間 < 30秒

### 9.2. テストフレームワーク
- **テストランナー**: Vitest
- **Reactコンポーネントテスト**: React Testing Library
- **モック**: Vitest (vi.fn(), vi.mock())
- **E2Eテスト**: Playwright または Cypress (検討中)

### 9.3. テストファイルの配置
- テスト対象ファイルと同じディレクトリに配置
- ファイル名: `<対象ファイル名>.test.tsx` または `<対象ファイル名>.spec.tsx`

### 9.4. テストのベストプラクティス
- 各テストは独立して実行可能にする
- テスト間で状態を共有しない
- `beforeEach` でセットアップ、`afterEach` でクリーンアップ
- わかりやすいテストケース名: `should` を使って期待する動作を記述
- AAA パターン (Arrange, Act, Assert) を使用
- 外部依存はモック化 (API、データベース、外部サービス)

### 9.5. テストの優先順位
- **高優先度**: 認証・認可機能、データの作成・更新・削除、決済処理 (将来)、セキュリティ関連機能
- **中優先度**: フォームバリデーション、ナビゲーション、データ表示、フィルタリング・ソート
- **低優先度**: UIの細かい調整、アニメーション、スタイリング

## 10. Git運用・開発フロー

### 10.1. ブランチ戦略
- **`main`**: 常に本番環境にデプロイ可能な、最も安定したブランチ
- **`develop`**: 次期リリースに向けた開発の統合ブランチ (機能開発の基点)
- **フィーチャーブランチ**: `develop` から作成
  - 機能追加: `feature/<機能名>`
  - バグ修正: `fix/<バグの概要>`
  - ドキュメント更新: `docs/<更新内容>`
  - リファクタリング: `refactor/<対象>`

### 10.2. コミットメッセージ
- 変更内容を簡潔かつ明確に記述
- 推奨フォーマット:
  ```
  <type>(<scope>): <subject>

  <body>

  <footer>
  ```
  - `type`: feat, fix, docs, style, refactor, test, chore など
  - `scope`: 変更箇所 (例: frontend, api, auth)
  - `subject`: 変更の要約 (50文字以内)
  - `body`: 詳細な変更内容
  - `footer`: 関連するIssue番号など

### 10.3. プルリクエスト
- すべての変更は、プルリクエスト (PR) を通じて `main` ブランチにマージ
- PRのタイトルは、コミットメッセージと同様の形式を使用
- PR作成時には、以下を含める:
  - 変更内容の要約
  - テスト方法
  - スクリーンショット (UI変更の場合)
  - 関連するIssue番号

### 10.4. コードレビュー
- すべてのコード変更は、少なくとも1名以上のレビュアーによるレビューを必須
- レビュー観点:
  - コーディング規約の遵守
  - 設計の妥当性
  - テストの網羅性
  - パフォーマンス
  - セキュリティ

### 10.5. マージ方針
- `main` ブランチへのマージは、Squash and Merge を推奨
- マージ後、作業ブランチは削除

## 11. CI/CD

### 11.1. CI (Continuous Integration)
- GitHub Actionsで自動実行
- プルリクエスト作成時:
  - ESLint チェック
  - Prettier チェック
  - TypeScript型チェック
  - テスト実行
  - ビルド確認

### 11.2. CD (Continuous Deployment)
- `main` ブランチへのマージ時に自動デプロイ
- Vercel: フロントエンド
- Supabase: データベースマイグレーション (手動承認後)

## 12. ドキュメンテーション

- APIの変更や複雑なロジックには、適宜ドキュメントを更新または追加
- README.mdは常に最新の状態を保つ
- コードコメントは、「なぜ」を説明（「何を」はコードから読み取れるため）
