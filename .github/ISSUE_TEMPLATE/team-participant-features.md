---
name: チーム・参加者機能の実装
about: チームログイン、参加者管理、対戦リザルト入力機能の実装
title: 'feat: チーム・参加者機能の完全実装'
labels: enhancement, feature
assignees: ''
---

## 概要

チームと参加者の管理機能、および参加者によるリザルト入力機能を実装する。

## 実装案の思考プロセス

### 全体の権限構造

```
運営（管理者）
  └─ 大会
      └─ チーム & 編集者（参加者IDで入る）
          └─ 個人（参加者）
```

## 機能要件

### 1. チーム機能

#### 1.1 チームの基本情報
- チーム名
- ユーザー名（ログイン用）
- パスワード
- 所属大会
- 編集権限の有無（運営チーム概念）

#### 1.2 チームができること
- ✅ **メンバーの追加・削除**（チーム自身 + 運営）
- ✅ **対戦リザルトの入力**（チーム自身、編集権限がある場合のみ）
- ✅ **リザルトの閲覧**（全チーム）
- ⚠️ **編集権限の管理**（運営のみ）

### 2. 個人（参加者）機能

#### 2.1 個人の基本情報
- 参加者名
- 所属チーム
- 編集権限の有無（二重管理を防ぐ）

#### 2.2 個人の特徴
- ❌ **アカウントなし**（チームの配下で名前だけ管理）
- 📊 **個人戦績**の表示（将来的に実装？）
- ⚠️ **編集権限の有無**で二重入力を防止

### 3. 対戦リザルト入力機能

#### 3.1 入力権限の制限
- **片側のチームのみ**が対戦リザルトを入力可能にする
  - 右側（または左側）のチームに入力権限を付与
  - 二重入力・矛盾を防ぐ

#### 3.2 入力可能な項目
- 自チームの選手・デッキ
- 相手チームの選手・デッキ（確認のため）
- スコア（自チーム vs 相手チーム）
- 日付

### 4. データエクスポート機能

#### 4.1 Googleスプレッドシート連携
- 対戦データをJSON形式で出力
- Googleスプレッドシートに反映する機能
- エクスポート形式の検討（CSV / JSON / Google Sheets API）

## 技術的な実装詳細

### データベーススキーマ

#### `teams` テーブル（既存）
```sql
- id (uuid)
- tournament_id (uuid, FK)
- team_name (text)
- username (text, unique)
- password_hash (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `participants` テーブル（既存）
```sql
- id (uuid)
- team_id (uuid, FK)
- name (text)
- can_edit (boolean) -- 編集権限の有無
- created_at (timestamp)
- updated_at (timestamp)
```

#### `matches` テーブルの拡張（検討）
```sql
-- 既存カラム
- team (text)
- opponent_team (text)
- ...

-- 追加検討カラム
- input_team_id (uuid, FK) -- どちらのチームが入力権限を持つか
- is_confirmed (boolean)   -- リザルトが確定されたか
- confirmed_at (timestamp)
- confirmed_by (uuid, FK)  -- 誰が確定したか（チームID）
```

### API エンドポイント（追加検討）

#### チーム用エンドポイント
```
GET    /api/teams/:teamId/matches        -- 自チームの対戦一覧
POST   /api/teams/:teamId/matches/:matchId/result -- リザルト入力
GET    /api/teams/:teamId/participants   -- 自チームの参加者一覧
POST   /api/teams/:teamId/participants   -- 参加者追加
PUT    /api/teams/:teamId/participants/:id -- 参加者編集
DELETE /api/teams/:teamId/participants/:id -- 参加者削除
```

#### 運営用エンドポイント
```
PUT    /api/admin/teams/:teamId/permissions -- チーム権限の変更
```

#### エクスポート用エンドポイント
```
GET    /api/tournaments/:tournamentId/export/json   -- JSON形式でエクスポート
GET    /api/tournaments/:tournamentId/export/csv    -- CSV形式でエクスポート
```

### フロントエンド画面構成

#### チーム側の画面
1. **チームログイン画面**（`/team-login`）✅ 既存
2. **チームダッシュボード**（`/team-dashboard`）🆕
   - 自チームの対戦一覧
   - 次の対戦情報
   - 戦績サマリー
3. **対戦リザルト入力画面**（`/team/:teamId/match/:matchId/result`）🆕
4. **参加者管理画面**（`/team/:teamId/participants`）✅ 既存

#### 運営側の画面拡張
1. **チーム一覧・管理画面**（`/admin/teams`）✅ 既存
2. **チーム編集ダイアログ**に編集権限の設定を追加 🆕
3. **対戦作成時に入力権限チームを指定** 🆳

## 実装の優先順位

### Phase 1: 基本機能（MVP）
- [ ] チームログイン機能の完成
- [ ] チーム専用ダッシュボード
- [ ] 自チームの対戦一覧表示
- [ ] 参加者の追加・削除機能（チーム側）

### Phase 2: リザルト入力機能
- [ ] 対戦リザルト入力フォーム（チーム側）
- [ ] 入力権限の制御（片側チームのみ）
- [ ] リザルト確定機能
- [ ] 二重入力防止機能

### Phase 3: 権限管理
- [ ] チームの編集権限フラグ
- [ ] 参加者の編集権限フラグ
- [ ] 権限に基づくUI制御

### Phase 4: データエクスポート
- [ ] JSON形式エクスポート
- [ ] CSV形式エクスポート
- [ ] Googleスプレッドシート連携（検討）

## セキュリティ考慮事項

- [ ] チームは自チームのデータのみアクセス可能
- [ ] 入力権限のないチームはリザルト入力不可
- [ ] 参加者の編集権限による二重入力防止
- [ ] JWT認証の実装（チームログイン用）

## UX 考慮事項

- チームログイン後、直感的にリザルト入力できる導線
- 対戦カードが視覚的に分かりやすい表示
- 入力済み・未入力の状態が一目で分かる
- スマートフォン対応（レスポンシブデザイン）

## 未解決の質問

1. **個人戦績の表示**は Phase 1 に含めるか？
2. **Googleスプレッドシート連携**の優先度は？
3. **右側 or 左側**のどちらのチームに入力権限を付与するか？
4. **対戦確定後の編集**は可能にするか？（運営のみ？）

## 関連イシュー・PR

- #XXX: チーム管理機能の基本実装（未作成）
- #XXX: 参加者管理機能（未作成）

## 参考資料

- `frontend/src/team/TeamLoginForm.tsx`
- `frontend/src/team/TeamManagementPage.tsx`
- `frontend/src/team/ParticipantManagementPage.tsx`
- `api/index.js` (チーム関連エンドポイント)
- `README.md` (開発ガイドライン)
