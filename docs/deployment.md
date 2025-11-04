# Deployment Guide

## 前提
- Vercel（Frontend）、Supabase（DB/Auth）
- GitHub Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, (SERVER) SUPABASE_SERVICE_ROLE_KEY, PASSWORD_RESET_REDIRECT_URL

## 手順
1. main にマージ → Vercel が自動デプロイ
2. Supabase マイグレーション
   - ローカルで検証後、`npx supabase db push`（本番は手動実行/手順化）
3. 環境変数設定（Vercel/Supabase）
4. 動作確認
   - /api ヘルスチェック
   - 管理者ログインとラウンド作成/締め
   - パスワードリセットメール（本番は実送）

## ロールバック
- フロント: Vercel の Previous Deployment へ Revert
- DB: 直近マイグレーションの down（要準備）またはスナップショット復元（要検証）

## 注意
- Service Role Key はフロントへ露出しない
- リリースノートは CHANGELOG.md に追記
