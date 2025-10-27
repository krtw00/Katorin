-- tournaments テーブルに Row Level Security (RLS) を設定
--
-- このマイグレーションは、tournamentsテーブルに対して行レベルセキュリティを有効化し、
-- ユーザーが自分の作成した大会のみにアクセスできるように制限します。

-- RLSを有効化
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（もし存在すれば）
DROP POLICY IF EXISTS "Users can view their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can insert their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can delete their own tournaments" ON public.tournaments;

-- ポリシー1: ユーザーは自分が作成した大会のみ閲覧可能
CREATE POLICY "Users can view their own tournaments"
ON public.tournaments
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- ポリシー2: 認証済みユーザーは新しい大会を作成可能（created_byは自動的に自分のIDになる）
CREATE POLICY "Users can insert their own tournaments"
ON public.tournaments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- ポリシー3: ユーザーは自分が作成した大会のみ更新可能
CREATE POLICY "Users can update their own tournaments"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- ポリシー4: ユーザーは自分が作成した大会のみ削除可能
CREATE POLICY "Users can delete their own tournaments"
ON public.tournaments
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 匿名ユーザー（anon）の権限を取り消し
REVOKE ALL ON public.tournaments FROM anon;

-- 認証済みユーザー（authenticated）に基本的な権限を付与
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;

-- サービスロール（service_role）には全権限を維持
GRANT ALL ON public.tournaments TO service_role;
