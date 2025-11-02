# Katorin - 対戦管理ツール

## プロジェクト概要

Katorinは、トーナメントの対戦を管理するために設計されたフルスタックのWebアプリケーションです。Reactベースのフロントエンド、Node.js/ExpressのバックエンドAPI、およびデータストレージ用のSupabase（PostgreSQL）データベースを特徴としています。このアプリケーションは、トーナメント、ラウンド、対戦、チーム、および参加者の管理を可能にします。

**主要技術:**

*   **フロントエンド:** React, TypeScript, Material-UI
*   **バックエンド:** Node.js, Express
*   **データベース:** Supabase (PostgreSQL)
*   **認証:** Supabase Auth

**アーキテクチャ:**

このプロジェクトは、フロントエンドとバックエンドのコードが別々のディレクトリ（`frontend`と`api`）にあるモノレポです。フロントエンドはREST APIを介してバックエンドと通信します。バックエンドはSupabaseデータベースと連携します。ローカル開発中、フロントエンドアプリケーション（ポート3000で実行）は、APIリクエストをバックエンドサーバー（ポート3001で実行）にプロキシします。

## ビルドと実行

### 初期設定

1.  **依存関係のインストール:**

    ```bash
    npm install
    npm install --prefix frontend
    ```

2.  **Supabaseの起動:**

    ```bash
    npx supabase start
    ```

3.  **環境変数の設定:**

    *   ルートディレクトリの`.env.local.example`を`.env.local`にコピーし、Supabaseの認証情報で更新します。
    *   `frontend/.env.local.example`を`frontend/.env.local`にコピーし、Supabaseの認証情報で更新します。
    *   `supabase/.env.example`を`supabase/.env`にコピーします。

4.  **データベースマイグレーションの実行:**

    ```bash
    npx supabase db push
    ```

### アプリケーションの実行

フロントエンドとバックエンドの両方の開発サーバーを起動するには、ルートディレクトリから次のコマンドを実行します。

```bash
npm run dev
```

アプリケーションは以下のURLで利用可能になります。

*   **フロントエンド:** http://localhost:3000
*   **API:** http://localhost:3001
*   **Supabase Studio:** http://127.0.0.1:54323
*   **Mailpit (メールテスト用):** http://127.0.0.1:54324

## 開発規約

*   **コーディングスタイル:** プロジェクトはコードフォーマットにPrettierを使用しています（`.prettierrc`の存在から推測）。
*   **テスト:** フロントエンドのテストはReact Testing Libraryを使用して設定されています（`frontend/package.json`から推測）。
*   **データベースマイグレーション:** データベーススキーマの変更は、`supabase/migrations`ディレクトリにあるマイグレーションファイルを通じて管理されます。
*   **国際化 (i18n):** フロントエンドは国際化に`i18next`を使用しています。翻訳はCSVファイル（`frontend/src/locales/translations.csv`）で管理され、スクリプトを使用してJSON形式に変換されます。