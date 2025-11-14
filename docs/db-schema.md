# データベーススキーマ

`supabase/migrations/`に保存されているマイグレーションによって定義されています。

## 主要テーブル

### `tournaments`

大会情報を管理します。

| 列名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | 主キー |
| `name` | `text` | 大会名 |
| `slug` | `text` | スラッグ (URL用、ユニーク) |
| `description` | `text` | 大会の説明 |
| `created_by` | `uuid` | 作成者のユーザーID (auth.users) |
| `created_at` | `timestamptz` | 作成日時 |

### `rounds`

大会内の各ラウンドを管理します。

| 列名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | 主キー |
| `tournament_id` | `uuid` | 関連する大会のID |
| `number` | `integer` | ラウンド番号 |
| `title` | `text` | ラウンドのタイトル |
| `status` | `text` | 状態 ('open', 'closed'など) |
| `created_at` | `timestamptz` | 作成日時 |
| `closed_at` | `timestamptz` | 終了日時 |

### `teams`

大会に参加するチームを管理します。

| 列名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | 主キー |
| `name` | `text` | チーム名 |
| `username` | `text` | チームのログイン用ユーザー名 (ユニーク) |
| `auth_user_id` | `uuid` | 関連する認証ユーザーID (auth.users) |
| `has_admin_access` | `boolean` | 管理者権限を持つかどうか |
| `tournament_id` | `uuid` | 関連する大会のID |
| `created_by` | `uuid` | 作成者のユーザーID (auth.users) |
| `created_at` | `timestamptz` | 作成日時 |
| `updated_at` | `timestamptz` | 更新日時 |

### `participants`

チームに所属する参加者を管理します。

| 列名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | 主キー |
| `team_id` | `uuid` | 所属するチームのID |
| `name` | `text` | 参加者名 |
| `created_by` | `uuid` | 作成者のユーザーID (auth.users) |
| `created_at` | `timestamptz` | 作成日時 |
| `updated_at` | `timestamptz` | 更新日時 |

### `matches`

対戦結果を記録します。

| 列名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | 主キー |
| `tournament_id` | `uuid` | 関連する大会のID |
| `round_id` | `uuid` | 関連するラウンドのID |
| `team_id` | `uuid` | 関連するチームのID |
| `team` | `text` | チーム名 |
| `player` | `text` | プレイヤー名 |
| `deck` | `text` | デッキ情報 |
| `selfScore` | `text` | 自身のスコア |
| `opponentScore` | `text` | 対戦相手のスコア |
| `opponentTeam` | `text` | 対戦相手のチーム名 |
| `opponentPlayer` | `text` | 対戦相手のプレイヤー名 |
| `opponentDeck` | `text` | 対戦相手のデッキ情報 |
| `date` | `date` | 対戦日 |
| `input_allowed_team_id` | `text` | 結果入力を許可されたチームのID |
| `result_status` | `text` | 結果の状態 ('draft', 'confirmed'など) |
| `locked_by` | `text` | 結果をロックしたユーザー |
| `locked_at` | `timestamptz` | ロック日時 |
| `finalized_at` | `timestamptz` | 最終確定日時 |
| `created_at` | `timestamptz` | 作成日時 |

## 将来対応

- ER図を追補（DBML/SQL生成から画像化）
