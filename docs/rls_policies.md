# Row-Level Security (RLS) Policies

データベースの各テーブルには、ユーザーの役割や権限に基づいてデータアクセスを制御するためのRLSポリシーが設定されています。

## `tournaments`

| 操作 | ポリシー | 説明 |
| :--- | :--- | :--- |
| `SELECT` | "Public tournaments" | 誰でも閲覧可能です。 |
| `INSERT` | "Allow authenticated users to create tournaments" | 認証済みのユーザーであれば誰でも作成できます。 |
| `UPDATE` | "Allow owner to update their tournaments" | トーナメントの作成者のみが更新できます。 |
| `DELETE` | "Allow owner to delete their tournaments" | トーナメントの作成者のみが削除できます。 |

## `rounds`

| 操作 | ポリシー | 説明 |
| :--- | :--- | :--- |
| `SELECT` | "Allow all users to read rounds" | 誰でも閲覧可能です。 |
| `INSERT` | "Allow tournament owner to insert rounds" | 関連するトーナメントの作成者のみが作成できます。 |
| `UPDATE` | "Allow tournament owner to update rounds" | 関連するトーナメントの作成者のみが更新できます。 |
| `DELETE` | "Allow tournament owner to delete rounds" | 関連するトーナメントの作成者のみが削除できます。 |

## `teams`

| 操作 | ポリシー | 説明 |
| :--- | :--- | :--- |
| `SELECT` | "Teams can be viewed by anyone." | 誰でも閲覧可能です。 |
| `INSERT` | "Teams can be created by authenticated users." | 認証済みのユーザーであれば誰でも作成できます。 |
| `UPDATE` | "Team members or admins can update team details." | チームの`auth_user_id`に紐づくユーザー、または管理者権限(`has_admin_access`)を持つユーザーが更新できます。 |
| `DELETE` | "Team members can delete their own team." | チームの`auth_user_id`に紐づくユーザーのみが削除できます。 |

## `participants`

| 操作 | ポリシー | 説明 |
| :--- | :--- | :--- |
| `SELECT` | "Team members and admins can view participants." | チームの作成者、または管理者権限(`has_admin_access`)を持つユーザーが閲覧できます。 |
| `INSERT` | "Team members and admins can create participants." | チームの作成者、または管理者権限(`has_admin_access`)を持つユーザーが作成できます。 |
| `UPDATE` | "Team members and admins can update participants." | チームの作成者、または管理者権限(`has_admin_access`)を持つユーザーが更新できます。 |
| `DELETE` | "Team members and admins can delete participants." | チームの作成者、または管理者権限(`has_admin_access`)を持つユーザーが削除できます。 |

## `matches`

| 操作 | ポリシー | 説明 |
| :--- | :--- | :--- |
| `SELECT` | "Matches can be viewed by team members or creator." | 関連するチームのメンバー、またはトーナメントの作成者が閲覧できます。 |
| `INSERT` | "Matches can be created by team members or creator." | 関連するチームのメンバー、またはトーナメントの作成者が作成できます。 |
| `UPDATE` | "Matches can be updated by team members or creator." | 関連するチームのメンバー、またはトーナメントの作成者が更新できます。結果入力が許可されている(`input_allowed_team_id`)場合にも更新可能です。 |
| `DELETE` | "Matches can be deleted by team members or creator." | 関連するチームのメンバー、またはトーナメントの作成者が削除できます。 |
