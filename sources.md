# コーディングルール参照元

このドキュメントは、`coding-rules.md` と `rules-checklist.md` を作成する際に参照した元ドキュメントの一覧です。

## 参照元ドキュメント

### プロジェクトルート
- `README.md`: プロジェクト概要、技術スタック、開発環境のセットアップ、使い方、Git運用ルール

### docs/
- `docs/coding-conventions.md`: コーディング規約（言語・フレームワーク、フォーマット、命名規則、開発フロー）
- `docs/architecture.md`: システムアーキテクチャ、技術スタック、ディレクトリ構造、データベース設計、状態管理、国際化、セキュリティ、CI/CD
- `docs/testing_guidelines.md`: テスト戦略、テストフレームワーク、単体・結合・E2Eテスト、ベストプラクティス
- `docs/environment-setup.md`: 環境構築手順、依存関係のインストール、Supabaseのセットアップ、トラブルシューティング
- `docs/db-schema.md`: データベーススキーマの概要、主要テーブル、インデックス
- `docs/frontend/architecture.md`: フロントエンドアーキテクチャの概要、ビルドツール、ディレクトリ構造

## ドキュメントの役割

### `coding-rules.md`
- **目的**: プロジェクトのコーディングルールを包括的にまとめた統合ドキュメント
- **対象者**: 開発者全員
- **内容**: 技術スタック、コーディング規約、TypeScript、React、Supabase、国際化、セキュリティ、アクセシビリティ、テスト、Git運用、CI/CD、ドキュメンテーション

### `rules-checklist.md`
- **目的**: プルリクエストやコードレビュー時に使用するチェックリスト
- **対象者**: 開発者、レビュアー
- **内容**: ファイル・コード構造、TypeScript、React、MUI、Supabase、国際化、セキュリティ、アクセシビリティ、テスト、コードフォーマット、Git/PR、CI/CD、ドキュメント、パフォーマンス

### `sources.md` (このファイル)
- **目的**: コーディングルールの参照元を明記し、ドキュメント間の関係を明確化
- **対象者**: ドキュメントメンテナー
- **内容**: 参照元ドキュメントの一覧、各ドキュメントの役割

## 更新時の注意点

- `coding-rules.md` や `rules-checklist.md` を更新する際は、元の `docs/**` ファイルも最新か確認してください。
- 新しいルールや規約を追加した場合は、関連する元ドキュメントにも反映することを推奨します。
- ルールに矛盾や不明点がある場合は、チームで議論して統一見解を決定してください。

## 参照リンク

- [Vitest 公式ドキュメント](https://vitest.dev/)
- [React Testing Library 公式ドキュメント](https://testing-library.com/react)
- [Supabase CLI ドキュメント](https://supabase.com/docs/guides/cli)
- [Material-UI (MUI) 公式ドキュメント](https://mui.com/)
- [react-i18next 公式ドキュメント](https://react.i18next.com/)
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/)
