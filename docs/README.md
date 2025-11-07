# Katorin ドキュメンテーション

このディレクトリは、Katorinプロジェクトのすべてのドキュメントをまとめた索引です。開発を始める前に、必要なドキュメントを確認してください。

## 📚 目次

### 🚀 はじめに

新規参加者は、以下の順序でドキュメントを読むことをお勧めします：

1. **[環境構築ガイド](./environment-setup.md)** - 開発環境のセットアップ手順
2. **[コーディング規約](./coding-conventions.md)** - コーディングスタイルと開発フロー
3. **[アーキテクチャ設計書](./architecture.md)** - システム全体の設計思想

---

## 📖 ドキュメント一覧

### 🛠️ セットアップ・環境構築

| ドキュメント | 説明 |
|------------|------|
| **[環境構築ガイド](./environment-setup.md)** | Node.js、Supabase CLI、依存関係のインストール、環境変数の設定方法を説明します。 |
| **[デプロイ手順](./deployment.md)** | VercelとSupabaseへの本番環境デプロイ手順、CI/CD設定について説明します。 |

---

### 📝 開発ガイドライン

| ドキュメント | 説明 |
|------------|------|
| **[コーディング規約](./coding-conventions.md)** | 命名規則、フォーマット、Git運用、開発フローなど、コードを記述する際の規約を定めています。 |
| **[テストガイドライン](./testing_guidelines.md)** | テスト戦略、Jest/React Testing Libraryの使い方、テストのベストプラクティスを説明します。 |

---

### 🏗️ アーキテクチャ・設計

| ドキュメント | 説明 |
|------------|------|
| **[アーキテクチャ設計書](./architecture.md)** | システム全体の構成、技術スタック、ディレクトリ構造、セキュリティ方針について解説します。 |
| **[データベーススキーマ](./db-schema.md)** | 主要テーブル、インデックス、RLSポリシーの概要を記載しています。 |
| **[RLSポリシー](./rls_policies.md)** | Row Level Security (RLS) ポリシーの詳細な設計と実装について説明します。 |
| **[トーナメント・ラウンド設計](./tournament_rounds.md)** | トーナメントとラウンドの管理方法、ラウンドの締め処理について説明します。 |

---

### 🌐 API仕様

| ドキュメント | 説明 |
|------------|------|
| **[APIエンドポイント一覧](./api/endpoints.md)** | すべてのAPIエンドポイント（46個）の詳細仕様、リクエスト/レスポンス形式、認証要件を記載しています。 |

---

### 🎨 フロントエンド開発

| ドキュメント | 説明 |
|------------|------|
| **[フロントエンドアーキテクチャ](./frontend/architecture.md)** | Create React App (CRA) ベースの構成、ディレクトリ構造、ルーティングについて説明します。 |
| **[国際化 (i18n)](./frontend/i18n.md)** | react-i18nextを使用した多言語対応の実装方法、翻訳ファイルの管理方法を説明します。 |
| **[パフォーマンス最適化](./frontend/performance.md)** | フロントエンドのパフォーマンス最適化手法、ベストプラクティスを紹介します。 |
| **[フロントエンドテスト](./frontend/testing.md)** | フロントエンド固有のテスト戦略、コンポーネントテストの書き方を説明します。 |

---

### 👥 運用・ワークフロー

| ドキュメント | 説明 |
|------------|------|
| **[管理者ワークフロー](./admin_workflows.md)** | 管理者が行う大会作成、ラウンド管理、チーム管理などの運用手順を説明します。 |
| **[参加者ワークフロー](./player_workflows.md)** | 参加者（プレイヤー）が行うログイン、試合結果入力などの手順を説明します。 |
| **[運用ランブック](./operational_runbooks.md)** | 定期的な運用タスク、バックアップ、メンテナンス手順を記載しています。 |
| **[インシデント対応](./incident_response.md)** | 障害発生時の対応手順、エスカレーションフロー、復旧手順を説明します。 |

---

### 🔧 トラブルシューティング

| ドキュメント | 説明 |
|------------|------|
| **[FAQ・トラブルシューティング](./faq_troubleshooting.md)** | よくある質問、エラーの解決方法、開発中に遭遇する問題の対処法をまとめています。 |

---

## 🗂️ ドキュメントの構成

```
docs/
├── README.md                    # このファイル（索引）
│
├── 【セットアップ】
├── environment-setup.md         # 環境構築ガイド
├── deployment.md                # デプロイ手順
│
├── 【開発ガイドライン】
├── coding-conventions.md        # コーディング規約
├── testing_guidelines.md        # テストガイドライン
│
├── 【アーキテクチャ・設計】
├── architecture.md              # アーキテクチャ設計書
├── db-schema.md                 # データベーススキーマ
├── rls_policies.md              # RLSポリシー
├── tournament_rounds.md         # トーナメント・ラウンド設計
│
├── 【API仕様】
└── api/
    └── endpoints.md             # APIエンドポイント一覧
│
├── 【フロントエンド】
└── frontend/
    ├── architecture.md          # フロントエンドアーキテクチャ
    ├── i18n.md                  # 国際化 (i18n)
    ├── performance.md           # パフォーマンス最適化
    └── testing.md               # フロントエンドテスト
│
├── 【運用・ワークフロー】
├── admin_workflows.md           # 管理者ワークフロー
├── player_workflows.md          # 参加者ワークフロー
├── operational_runbooks.md      # 運用ランブック
├── incident_response.md         # インシデント対応
│
└── 【トラブルシューティング】
    └── faq_troubleshooting.md   # FAQ・トラブルシューティング
```

---

## 📌 クイックリンク

### 開発者向け

- **環境構築**: [environment-setup.md](./environment-setup.md)
- **コーディング規約**: [coding-conventions.md](./coding-conventions.md)
- **API仕様**: [api/endpoints.md](./api/endpoints.md)
- **テスト**: [testing_guidelines.md](./testing_guidelines.md)

### 運用担当者向け

- **管理者ワークフロー**: [admin_workflows.md](./admin_workflows.md)
- **デプロイ手順**: [deployment.md](./deployment.md)
- **運用ランブック**: [operational_runbooks.md](./operational_runbooks.md)
- **インシデント対応**: [incident_response.md](./incident_response.md)

### アーキテクト向け

- **システムアーキテクチャ**: [architecture.md](./architecture.md)
- **データベーススキーマ**: [db-schema.md](./db-schema.md)
- **RLSポリシー**: [rls_policies.md](./rls_policies.md)

---

## 📝 ドキュメント更新ポリシー

- **常に最新を保つ**: コード変更時には関連するドキュメントも必ず更新してください。
- **レビュー必須**: ドキュメント変更もプルリクエストでレビューを受けます。
- **明確で簡潔に**: 技術的に正確で、読みやすい文章を心がけてください。
- **例を含める**: 可能な限り具体的な例やコードスニペットを含めてください。

---

## 🤝 貢献

ドキュメントの改善提案や誤字脱字の修正は、いつでも歓迎します。プルリクエストを作成してください。

---

## 📖 関連リンク

- **[プロジェクトREADME](../README.md)**: プロジェクト全体の概要
- **[GitHub リポジトリ](https://github.com/krtw00/Katorin)**: ソースコード
- **[Supabase ダッシュボード](https://supabase.com/dashboard)**: データベース管理
