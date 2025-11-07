# 認証システム統一マイグレーションガイド

## 概要

Katorinの認証システムをカスタムJWT方式からSupabase Auth方式に完全統一しました。

## 変更内容

### バックエンド（API）

#### 削除されたもの
- `JWT_SECRET`環境変数（不要になりました）
- `requireTeamAuth`ミドルウェア
- `jsonwebtoken`、`bcrypt`依存関係

#### 追加されたもの
- `attachTeam`ミドルウェア（`requireAuth`の後に使用）
  - `req.user`から`teams`テーブルを検索
  - `req.team`と`req.teamId`を設定

#### 変更されたエンドポイント

**POST /api/teams/login**

**変更前:**
```json
{
  "username": "team-username",
  "password": "password"
}
```
レスポンス:
```json
{
  "teamId": "uuid",
  "name": "チーム名",
  "username": "team-username",
  "token": "カスタムJWT"
}
```

**変更後:**
```json
{
  "username": "team-username",
  "password": "password"
}
```
レスポンス:
```json
{
  "teamId": "uuid",
  "name": "チーム名",
  "username": "team-username",
  "token": "Supabase Authアクセストークン",
  "refreshToken": "Supabase Authリフレッシュトークン",
  "expiresAt": 1234567890
}
```

**認証が必要なエンドポイント**

全ての`requireTeamAuth`が`requireAuth + attachTeam`に置き換えられました:
- `/api/team/me`
- `/api/team/participants`
- `/api/team/matches`
- など

認証ヘッダーの形式は同じ:
```
Authorization: Bearer <Supabase Authアクセストークン>
```

### フロントエンド（必要な変更）

#### チームログイン処理

**変更前:**
```typescript
const response = await fetch('/api/teams/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
const { token } = await response.json();
// カスタムJWTトークンを保存
localStorage.setItem('teamToken', token);
```

**変更後:**
```typescript
const response = await fetch('/api/teams/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
const { token, refreshToken, expiresAt } = await response.json();

// Supabaseセッションとして保存
await supabase.auth.setSession({
  access_token: token,
  refresh_token: refreshToken,
});

// または、ローカルストレージに保存
localStorage.setItem('teamToken', token);
localStorage.setItem('teamRefreshToken', refreshToken);
```

#### 認証済みAPIリクエスト

**変更は不要です**。同じヘッダー形式を使用:
```typescript
const token = localStorage.getItem('teamToken');
fetch('/api/team/matches', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

#### Supabaseクライアントの使用

チームログイン後、Supabaseクライアントを使用してRLSが適用されたクエリを実行できます:

```typescript
// チームログイン後
const { token, refreshToken } = loginResponse;
await supabase.auth.setSession({
  access_token: token,
  refresh_token: refreshToken,
});

// RLSが自動的に適用される
const { data: matches } = await supabase
  .from('matches')
  .select('*')
  .eq('team_id', teamId);
```

## マイグレーション手順

### 開発環境

1. **環境変数の更新**
   ```bash
   # .env.local から JWT_SECRET を削除
   # ALLOWED_ORIGINS は維持
   ```

2. **依存関係の更新**
   ```bash
   npm install  # package-lock.jsonが更新されているため
   ```

3. **フロントエンドコードの更新**
   - チームログインコンポーネントを更新（上記参照）
   - トークンの保存方法を更新
   - 必要に応じてSupabaseセッション管理を使用

4. **動作確認**
   ```bash
   npm run dev
   ```

### 本番環境

1. **環境変数の確認**
   - Vercel/本番環境から`JWT_SECRET`を削除
   - `ALLOWED_ORIGINS`を適切に設定

2. **データベースの確認**
   - `teams`テーブルに`auth_user_id`カラムが存在することを確認
   - `password_hash`カラムが削除されていることを確認

3. **フロントエンドのデプロイ**
   - 更新されたチームログインコードをデプロイ

4. **バックエンドのデプロイ**
   - 新しいAPIコードをデプロイ

## メリット

### セキュリティ
- カスタムJWT実装の削除（脆弱性リスクの低減）
- Supabaseの堅牢な認証システムを使用
- トークンのリフレッシュが自動化

### 保守性
- 認証方式の統一（管理者もチームもSupabase Auth）
- コードがシンプルに（JWT署名/検証ロジックの削除）
- RLSポリシーとの完全な統合

### 機能性
- セッション管理が改善
- リフレッシュトークンによる長期間のログイン
- Supabaseの全機能（パスワードリセット、MFA等）が利用可能

## トラブルシューティング

### チームログインが失敗する

**症状:** "無効なユーザー名またはパスワードです"

**原因:**
- `teams`テーブルに`auth_user_id`が設定されていない
- マイグレーションが未実行

**解決方法:**
```bash
npx supabase db reset  # ローカル環境
npx supabase db push   # 本番環境（マイグレーション適用）
```

### 既存のチームが使用できない

**症状:** 既存のチームでログインできない

**原因:**
- 古いチームレコードに`auth_user_id`が未設定

**解決方法:**
1. 管理者画面から該当チームを削除
2. 新規にチーム登録
3. または、手動でSupabase Authユーザーを作成し`auth_user_id`を更新

### トークンの有効期限

**症状:** 1時間後にログアウトされる

**原因:**
- Supabase Authのデフォルト設定（1時間）

**解決方法:**
- リフレッシュトークンを使用してセッションを更新
- Supabaseクライアントが自動的に処理

```typescript
// 自動リフレッシュを有効化
const { data, error } = await supabase.auth.refreshSession();
```

## 参考資料

- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [セッション管理](https://supabase.com/docs/reference/javascript/auth-setsession)
