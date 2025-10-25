# Katorin 開発メモ

このリポジトリでは Supabase をデータストアとして利用し、`/api/matches` 経由でフロントエンドと連携します。ローカル Supabase を使った開発手順を以下にまとめます。

## 必要なツール

- Node.js 18 以上
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)（Docker が必要）

## 初期セットアップ

```bash
npm install
npm install --prefix frontend
```

## Supabase の起動と環境変数

1. Supabase を起動します。
   ```bash
   supabase start
   ```
   初回起動時に `supabase/.env` が生成され、Anon キーなどが記載されます。

2. API サーバーは `.env.local` → `.env` → `supabase/.env` の順番で環境変数を読み込みます。最も簡単なのは生成されたファイルをそのままコピーする方法です。
   ```bash
   cp supabase/.env .env.local
   ```

3. 手動で設定する場合は最低限以下 2 つを定義してください。
   ```env
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=（supabase/.env に記載の anon キー）
   ```

## データベーススキーマ

`supabase/migrations/20250305000000_create_matches.sql` に対戦記録テーブルを作成するマイグレーションを用意しています。

```bash
supabase db push
```

テーブルは以下のカラムを持ちます。

- `team`, `player`, `deck`
- `selfScore`, `opponentScore`
- `opponentTeam`, `opponentPlayer`, `opponentDeck`
- `date`（日付）

これらのカラム名はフロントエンドから送信される JSON のキー（キャメルケース）と一致しています。

## ローカル開発の起動

バックエンド(API)とフロントエンドを同時に立ち上げ、コード保存時に自動リロードされます。

```bash
# 両方まとめて起動（API:3001 / Frontend:3000）
npm run dev

# どちらか片方だけ起動したい場合
npm run dev:api        # nodemon で API をホットリロード
npm run dev:frontend   # CRA 開発サーバー
```

フロントエンドは `package.json` の `proxy` 設定によりポート 3001 の API へリクエストを転送します。

## API エンドポイント

- `GET /api/matches`  
  対戦記録を新しい日付順で取得します。
- `POST /api/matches`  
  1 件の対戦記録を登録します。
- `PUT /api/matches/:id`  
  指定 ID の対戦記録を更新します。
- `DELETE /api/matches/:id`  
  指定 ID の対戦記録を削除します。

エラーが発生した場合はレスポンスにメッセージが含まれ、サーバーログにも詳細が出力されます。
