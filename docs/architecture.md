# アーキテクチャ設計書

## 1. はじめに
このドキュメントは、Katorinプロジェクトのシステムアーキテクチャを説明します。全体構成、技術スタック、データフロー、および設計上の決定事項を記載します。

## 2. システム概要

### 2.1. プロジェクトの目的
Katorinは、トーナメント管理システムです。チーム管理、試合結果の入力、リーグ戦・デュエル形式の対戦管理などを提供します。

### 2.2. 主要機能
- ユーザー認証 (管理者・チーム)
- トーナメント作成・管理
- チーム登録・参加者管理
- 試合結果の入力・表示
- リアルタイム更新
- 多言語対応 (日本語・英語)

## 3. 技術スタック

### 3.1. フロントエンド
- **言語**: TypeScript
- **フレームワーク**: React 18/19 系（Create React App ベース）
- **UI ライブラリ**: Material-UI (MUI)
- **ビルド/開発**: Create React App（`react-scripts`）
- **国際化**: react-i18next
- **状態管理**: React Context API + Hooks
- **テスト**: Jest（CRA 標準）+ React Testing Library

### 3.2. バックエンド
- **BaaS**: Supabase
  - **認証**: Supabase Auth
  - **データベース**: PostgreSQL (Supabaseホスティング)
  - **ストレージ**: Supabase Storage (将来的に使用予定)
  - **Edge Functions**: Deno (将来的に使用予定)
  - **リアルタイム**: Supabase Realtime

### 3.3. インフラ
- **ホスティング**: Vercel (フロントエンド), Supabase (バックエンド)
- **CI/CD**: GitHub Actions
- **バージョン管理**: Git (GitHub)

## 4. システムアーキテクチャ

### 4.1. 全体構成
```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│     Vercel      │
│  (Frontend)     │
└────────┬────────┘
         │ API (HTTPS)
         ▼
┌─────────────────┐
│    Supabase     │
│  - Auth         │
│  - PostgreSQL   │
│  - Realtime     │
│  - Storage      │
└─────────────────┘
```

### 4.2. フロントエンドアーキテクチャ
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

### 4.3. ディレクトリ構造の設計方針
- **Feature-based**: 機能ごとにディレクトリを分割 (`admin/`, `auth/`, `team/`)
- **共通コンポーネント**: 複数の機能で使用するコンポーネントは `components/` に配置
- **型定義**: すべての型定義は `types/` ディレクトリに集約
- **ユーティリティ**: 共通関数は `lib/` または `utils/` に配置

## 5. データベース設計

### 5.1. 主要テーブル
- **admins**: 管理者アカウント
- **teams**: チーム情報
- **tournaments**: トーナメント情報
- **participants**: 参加者情報
- **matches**: 試合情報
- **results**: 試合結果

### 5.2. Row Level Security (RLS)
- すべてのテーブルにRLSポリシーを適用
- ユーザーは自分のデータのみアクセス可能
- 管理者は全データにアクセス可能

### 5.3. マイグレーション管理
- マイグレーションファイルは `supabase/migrations/` に配置
- タイムスタンプ形式で管理: `YYYYMMDD_description.sql`
- ローカル開発: `npx supabase migration new <name>`
- 本番適用: `npx supabase db push`

## 6. 認証・認可

### 6.1. 認証フロー
1. ユーザーがログインフォームに入力
2. Supabase Authでメール・パスワード認証
3. JWTトークンを発行 (Supabaseが自動管理)
4. クライアントはトークンをセッションストレージに保存
5. 以降のリクエストにトークンを含める

### 6.2. 認可方針
- **管理者**: すべての機能にアクセス可能
- **チーム**: 自分のチーム情報のみ閲覧・編集可能
- **未認証ユーザー**: 公開ページのみ閲覧可能

### 6.3. セッション管理
- Supabase Authのセッション管理機能を使用
- セッション有効期限: 24時間 (デフォルト)
- リフレッシュトークンで自動更新

## 7. 状態管理

### 7.1. ローカル状態
- コンポーネント内の状態: `useState`, `useReducer`
- フォーム入力、UI状態など

### 7.2. グローバル状態
- 認証状態: Context API (`AuthContext`)
- アプリケーション設定: Context API (`AppContext`)
- 言語設定: react-i18next

### 7.3. サーバー状態
- Supabaseクライアントで直接フェッチ
- 将来的にReact Queryの導入を検討

## 8. 国際化 (i18n)

### 8.1. サポート言語
- 日本語 (ja): デフォルト
- 英語 (en)

### 8.2. 翻訳ファイル
- `src/locales/ja/translation.json`
- `src/locales/en/translation.json`

### 8.3. 実装方針
- すべてのUIテキストを翻訳キー化
- ハードコーディングの禁止
- 動的コンテンツも翻訳可能に

## 9. パフォーマンス最適化

### 9.1. フロントエンド
- コード分割: React.lazy() でルートごとに分割
- メモ化: React.memo, useMemo, useCallback を適切に使用
- 画像最適化: WebP形式、遅延ロード
- バンドルサイズ: Viteでの最適化

### 9.2. データベース
- インデックス: 頻繁に検索されるカラムにインデックスを設定
- クエリ最適化: 必要なカラムのみ取得
- リアルタイム: 必要な場合のみサブスクライブ

### 9.3. キャッシング
- ブラウザキャッシュ: 静的ファイルのキャッシュ
- Supabaseのキャッシュ機能を活用

## 10. セキュリティ

### 10.1. 認証・認可
- Supabase Authで一元管理
- JWTトークンの安全な保管
- RLSポリシーでデータアクセス制御

### 10.2. XSS対策
- Reactのデフォルトエスケープ機能
- dangerouslySetInnerHTML の使用禁止

### 10.3. CSRF対策
- トークンベース認証 (Supabase Auth)
- SameSite Cookie属性

### 10.4. 環境変数管理
- `.env.local` ファイルで管理
- フロントエンドは CRA の慣習に従い `REACT_APP_` プレフィックス（例: `REACT_APP_SUPABASE_URL`）
- サーバーサイドは `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` など
- GitHub Secrets で本番環境の変数を管理

## 11. テスト戦略

### 11.1. 単体テスト
- コンポーネントのロジックテスト
- カスタムHooksのテスト
- ユーティリティ関数のテスト

### 11.2. 結合テスト
- コンポーネント間の連携テスト
- API呼び出しのモックテスト

### 11.3. E2Eテスト (将来)
- ユーザーシナリオベースのテスト
- Playwright または Cypress を使用

## 12. CI/CD

### 12.1. CI (Continuous Integration)
- GitHub Actionsで自動実行
- プルリクエスト作成時:
  - ESLint チェック
  - Prettier チェック
  - TypeScript型チェック
  - テスト実行
  - ビルド確認

### 12.2. CD (Continuous Deployment)
- `main` ブランチへのマージ時に自動デプロイ
- Vercel: フロントエンド
- Supabase: データベースマイグレーション (手動承認後)

## 13. 監視・ログ

### 13.1. エラーログ
- フロントエンド: コンソールログ、Sentry (将来的に検討)
- バックエンド: Supabaseのログ機能

### 13.2. パフォーマンス監視
- Vercel Analytics
- Web Vitals (Core Web Vitals)

## 14. 今後の拡張計画

### 14.1. 短期
- E2Eテストの導入
- React Queryによるサーバー状態管理
- エラー監視 (Sentry)

### 14.2. 中期
- Supabase Edge Functionsの活用
- Supabase Storageでのファイルアップロード機能
- PWA対応

### 14.3. 長期
- モバイルアプリ (React Native)
- マイクロサービス化の検討
- スケーラビリティの向上
