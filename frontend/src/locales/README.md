# 翻訳ファイル管理ガイド

このディレクトリには、アプリケーションの多言語対応（日本語・英語）のための翻訳ファイルが格納されています。

## ファイル構成

```
locales/
├── README.md                # このファイル
├── translations.csv         # 翻訳管理用CSVファイル（スプレッドシート用）
├── ja/                      # 日本語翻訳
│   └── common.json
└── en/                      # 英語翻訳
    └── common.json
```

## 翻訳作業の流れ

### 1. スプレッドシートで翻訳を編集する方法（推奨）

開発者以外の方でも翻訳作業に参加できる方法です。

#### ステップ1: CSVファイルをスプレッドシートに取り込む

1. `translations.csv` ファイルをGoogle スプレッドシートまたはExcelで開く
2. スプレッドシートの構造：
   - **A列 (key)**: 翻訳キー（編集しない）
   - **B列 (ja)**: 日本語の翻訳テキスト
   - **C列 (en)**: 英語の翻訳テキスト

#### ステップ2: 翻訳を編集する

- **日本語（ja列）**: すでに入力されているので、必要に応じて修正
- **英語（en列）**: 英語翻訳を追加・修正

例：
| key | ja | en |
|-----|----|----|
| auth.login.title | Katorin ログイン | Katorin Login |
| auth.login.emailLabel | メールアドレス | Email Address |

#### ステップ3: CSVファイルとして保存する

- スプレッドシートを編集したら、**CSV形式**で保存
- ファイル名は `translations.csv` のまま
- 保存場所: `frontend/src/locales/translations.csv`

#### ステップ4: 開発者がJSONファイルに変換する

翻訳者がCSVを更新したら、開発者が以下のコマンドを実行してJSONファイルに変換します：

```bash
cd frontend
npm run i18n:csv-to-json
```

このコマンドにより、`translations.csv` から各言語のJSONファイルが自動生成されます。

### 2. JSONファイルを直接編集する方法

開発者向けの方法です。

#### ja/common.json（日本語）

```json
{
  "auth": {
    "login": {
      "title": "Katorin ログイン",
      "emailLabel": "メールアドレス"
    }
  }
}
```

#### en/common.json（英語）

```json
{
  "auth": {
    "login": {
      "title": "Katorin Login",
      "emailLabel": "Email Address"
    }
  }
}
```

## 翻訳キーの命名規則

翻訳キーは「ドット記法」で階層構造を表現します：

- `auth.login.title` → 認証 > ログイン > タイトル
- `auth.login.emailLabel` → 認証 > ログイン > メールラベル

### 命名のガイドライン

1. **機能ごとにグループ化**: `auth`, `dashboard`, `settings` など
2. **画面・コンポーネントごとにサブグループ化**: `auth.login`, `auth.register` など
3. **用途が分かる名前**: `title`, `button`, `label`, `error` など

## 変数（プレースホルダー）の使い方

動的な値を挿入する場合は、`{{変数名}}` を使用します。

### 例

CSVファイル：
```
key,ja,en
message.welcome,ようこそ、{{name}}さん,Welcome, {{name}}
```

コンポーネントでの使用：
```typescript
t('message.welcome', { name: 'Taro' })
// 結果: 「ようこそ、Taroさん」または "Welcome, Taro"
```

## 新しい翻訳を追加する手順

### スプレッドシート経由の場合

1. `translations.csv` をスプレッドシートで開く
2. 新しい行を追加
3. **key列**: 翻訳キーを入力（例: `dashboard.title`）
4. **ja列**: 日本語訳を入力
5. **en列**: 英語訳を入力
6. CSVとして保存
7. 開発者が `npm run i18n:csv-to-json` を実行

### JSON直接編集の場合

1. `ja/common.json` に日本語訳を追加
2. `en/common.json` に英語訳を追加
3. 同じキー構造を維持する

## よくある質問

### Q1. 翻訳が反映されない

- ブラウザをリロードしてください
- 開発サーバーを再起動してください（`npm start`）

### Q2. CSVファイルの形式が壊れた

- カンマ（`,`）やダブルクォート（`"`）が含まれるテキストは、ダブルクォートで囲んでください
- 例: `"こんにちは、世界"` （カンマを含む場合）

### Q3. 新しい言語を追加したい

1. `translations.csv` に新しい列を追加（例: `zh`）
2. `npm run i18n:csv-to-json` を実行
3. `src/i18n.ts` で新しい言語を登録

## サポート

翻訳作業で不明な点があれば、開発チームにお問い合わせください。
