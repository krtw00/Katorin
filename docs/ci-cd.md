# CI/CD パイプライン

## 概要

KatorinプロジェクトではGitHub Actionsを使用してCI/CD（継続的インテグレーション/継続的デプロイ）パイプラインを構築しています。

## ワークフロー一覧

### 1. CI (Continuous Integration) - `ci.yml`

**トリガー:**
- `main`および`develop`ブランチへのプッシュ
- `main`および`develop`ブランチへのプルリクエスト

**実行内容:**

#### Lint and Type Check
- ESLintによるコード品質チェック
- TypeScript型チェック

#### Run Tests
- 単体テスト・結合テストの実行
- カバレッジレポートの生成
- Codecovへのアップロード（オプション）

#### Build Application
- フロントエンドのビルド確認
- ビルド成果物のアーティファクト保存（7日間）

#### API Check
- APIコードの構文チェック
- セキュリティ脆弱性スキャン（npm audit）

### 2. PR Checks (Pull Request Checks) - `pr-checks.yml`

**トリガー:**
- プルリクエストの作成・更新時

**実行内容:**

#### PR Information
- ブランチ命名規則の確認
  - 推奨形式: `feature/*`, `fix/*`, `docs/*`, `refactor/*`, `test/*`, `chore/*`
  - Claude Code: `claude/*`
- 変更ファイルの一覧表示
- データベースマイグレーションファイルの検出
- package.json変更の検出

#### Size Check
- ビルドサイズの測定
- 5MBを超える場合は警告表示

#### Test Coverage Report
- テストカバレッジの計算
- PRコメントへのカバレッジサマリー投稿
  - Lines, Statements, Functions, Branches
  - 30%未満の場合は警告

### 3. Deploy (Deployment) - `deploy.yml`

**トリガー:**
- `main`ブランチへのプッシュ
- 手動実行（workflow_dispatch）

**実行内容:**

#### Pre-deployment Checks
- テストの再実行
- ビルドの検証
- セキュリティ監査

#### Deployment Notification
- デプロイ開始通知
- コミット情報の表示

#### Verify Deployment
- Vercelデプロイの待機
- デプロイ完了の確認

**注意:** Vercelは自動的にGitHubと連携してデプロイを行います。このワークフローは主に事前チェックと通知のために実行されます。

### 4. Supabase Migrations - `release.yml`

**トリガー:**
- `main`ブランチへのプッシュ

**実行内容:**
- Supabase CLIのセットアップ
- プロジェクトへのリンク
- データベースマイグレーションの適用

**必要なシークレット:**
- `SUPABASE_ACCESS_TOKEN`: SupabaseのアクセストークN
- `SUPABASE_PROJECT_REF`: プロジェクト参照ID
- `SUPABASE_DB_PASSWORD`: データベースパスワード

## GitHub Secrets の設定

CI/CDパイプラインを正しく動作させるために、以下のシークレットをGitHubリポジトリに設定してください。

### 必須シークレット

| シークレット名 | 説明 | 使用ワークフロー |
|-------------|------|----------------|
| `SUPABASE_ACCESS_TOKEN` | Supabaseアクセストークン | release.yml |
| `SUPABASE_PROJECT_REF` | Supabaseプロジェクト参照ID | release.yml |
| `SUPABASE_DB_PASSWORD` | データベースパスワード | release.yml |

### オプショナルシークレット

| シークレット名 | 説明 | 使用ワークフロー |
|-------------|------|----------------|
| `REACT_APP_SUPABASE_URL` | Supabase URL | ci.yml, deploy.yml |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase匿名キー | ci.yml, deploy.yml |
| `CODECOV_TOKEN` | Codecovトークン | ci.yml (カバレッジアップロード用) |

**注意:** ビルド時に環境変数が必須でない場合、ダミー値が使用されます。

## シークレットの設定方法

1. GitHubリポジトリページにアクセス
2. **Settings** → **Secrets and variables** → **Actions** を開く
3. **New repository secret** をクリック
4. シークレット名と値を入力
5. **Add secret** をクリック

## ワークフローの実行確認

### 実行状況の確認

1. GitHubリポジトリの **Actions** タブを開く
2. 実行中/完了したワークフローを確認
3. ワークフロー名をクリックして詳細を表示

### ワークフローの再実行

1. 失敗したワークフローをクリック
2. **Re-run jobs** ボタンをクリック
3. **Re-run all jobs** を選択

### ログの確認

1. ワークフローの実行ページを開く
2. ジョブ名をクリック
3. 各ステップのログを確認

## ローカルでのワークフロー検証

GitHub Actions のワークフローをローカルで検証するには、[act](https://github.com/nektos/act)を使用できます。

```bash
# actのインストール (macOS)
brew install act

# actのインストール (Linux)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# ワークフローの実行
act push  # push イベントのワークフローを実行
act pull_request  # PR イベントのワークフローを実行
```

## トラブルシューティング

### ワークフローが失敗する

#### ESLint エラー
```
Error: ESLint found warnings/errors
```

**解決策:**
```bash
npm run lint:fix --prefix frontend
```

#### TypeScript エラー
```
Error: Type check failed
```

**解決策:**
```bash
npm run typecheck --prefix frontend
```

#### テスト失敗
```
Error: Tests failed
```

**解決策:**
```bash
npm test --prefix frontend
```

#### ビルドエラー
```
Error: Build failed
```

**解決策:**
1. 環境変数が正しく設定されているか確認
2. ローカルでビルドを実行して問題を特定
```bash
npm run build --prefix frontend
```

### シークレットが見つからない

```
Error: Secret SUPABASE_ACCESS_TOKEN not found
```

**解決策:**
1. GitHubリポジトリの Settings → Secrets を確認
2. 必要なシークレットが設定されているか確認
3. シークレット名のスペルミスを確認

### Supabaseマイグレーションエラー

```
Error: Migration failed
```

**解決策:**
1. ローカルでマイグレーションをテスト
```bash
npx supabase db reset
```
2. マイグレーションファイルの構文エラーを確認
3. Supabaseダッシュボードでデータベース状態を確認

## ベストプラクティス

### コミット前のチェック

ワークフローの失敗を防ぐため、プッシュ前に以下を実行してください:

```bash
# Lintチェック
npm run lint --prefix frontend

# 型チェック
npm run typecheck --prefix frontend

# テスト
npm test --prefix frontend

# ビルド
npm run build --prefix frontend
```

### プルリクエストのマージ条件

以下の条件を満たしてからマージしてください:
- ✅ すべてのCIチェックが成功
- ✅ コードレビューが完了
- ✅ テストカバレッジが適切（目標: 30%以上）
- ✅ ビルドサイズが適切（5MB以下推奨）

### ブランチ戦略

```
main (本番環境)
  ├── develop (開発環境)
  │   ├── feature/new-feature
  │   ├── fix/bug-fix
  │   └── refactor/code-cleanup
```

1. `feature/*`, `fix/*` ブランチから `develop` へPR
2. `develop` で動作確認
3. `develop` から `main` へPR（リリース時）

## パフォーマンスの最適化

### キャッシュの活用

ワークフローでは`actions/setup-node@v4`のキャッシュ機能を使用しています:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: |
      package-lock.json
      frontend/package-lock.json
```

これにより、依存関係のインストール時間が短縮されます。

### 並列実行

CIワークフローの各ジョブ（lint, test, build, api-check）は並列実行されるため、全体の実行時間が短縮されます。

## 監視とアラート

### ワークフロー失敗時の通知

GitHubの通知設定で、ワークフロー失敗時にメール通知を受け取ることができます:

1. **Settings** → **Notifications**
2. **Actions** セクションで通知を有効化

### ステータスバッジの追加

README.mdにワークフローのステータスバッジを追加できます:

```markdown
![CI](https://github.com/your-org/Katorin/workflows/CI/badge.svg)
![Deploy](https://github.com/your-org/Katorin/workflows/Deploy/badge.svg)
```

## 参考リソース

- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [Vercel デプロイガイド](https://vercel.com/docs/deployments/overview)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli/introduction)
