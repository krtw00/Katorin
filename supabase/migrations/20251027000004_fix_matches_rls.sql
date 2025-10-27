-- matches テーブルの RLS ポリシーを修正
--
-- 現在のポリシーは全ての認証済みユーザーがアクセス可能になっていますが、
-- これを大会の作成者のみがアクセスできるように制限します。

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated read matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated insert matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated update matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated delete matches" ON public.matches;

-- 新しいポリシー: ユーザーは自分が作成した大会の試合のみ閲覧可能
CREATE POLICY "Users can view matches of their tournaments"
ON public.matches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);

-- 新しいポリシー: ユーザーは自分が作成した大会の試合のみ作成可能
CREATE POLICY "Users can insert matches for their tournaments"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);

-- 新しいポリシー: ユーザーは自分が作成した大会の試合のみ更新可能
CREATE POLICY "Users can update matches of their tournaments"
ON public.matches
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);

-- 新しいポリシー: ユーザーは自分が作成した大会の試合のみ削除可能
CREATE POLICY "Users can delete matches of their tournaments"
ON public.matches
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);
