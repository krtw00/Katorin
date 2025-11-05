# Operational Runbooks

## 障害切り分け
1. 影響範囲の把握（管理者/参加者/全体）
2. Vercel デプロイ状況/ロールバック候補確認
3. Supabase ステータス/ログ（Auth/DB/Realtime）

## 代表的な手順
- 再起動（Frontend）: Vercel で再デプロイ
- 環境変数変更: Vercel/Supabase で更新→再デプロイ
- メール不達: SMTP 設定見直し、Mailpit で再現確認

## 監視
- Vercel Analytics / Web Vitals
- Supabase Logs（エラー率/パフォーマンス）
- 将来: Sentry 導入
