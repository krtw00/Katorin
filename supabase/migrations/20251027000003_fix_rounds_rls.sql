-- rounds テーブルの RLS ポリシーを修正
--
-- 現在のポリシーは全ての認証済みユーザーがアクセス可能になっていますが、
-- これを大会の作成者のみがアクセスできるように制限します。

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated read rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow authenticated insert rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow authenticated update rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow authenticated delete rounds" ON public.rounds;

-- 新しいポリシー: ユーザーは自分が作成した大会のラウンドのみ閲覧可能
CREATE POLICY "Users can view rounds of their tournaments"
ON public.rounds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = rounds.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);

-- 新しいポリシー: ユーザーは自分が作成した大会のラウンドのみ作成可能
CREATE POLICY "Users can insert rounds for their tournaments"
ON public.rounds
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = rounds.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);

-- 新しいポリシー: ユーザーは自分が作成した大会のラウンドのみ更新可能
CREATE POLICY "Users can update rounds of their tournaments"
ON public.rounds
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = rounds.tournament_id
    AND tournaments.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = rounds.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);

-- 新しいポリシー: ユーザーは自分が作成した大会のラウンドのみ削除可能
CREATE POLICY "Users can delete rounds of their tournaments"
ON public.rounds
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = rounds.tournament_id
    AND tournaments.created_by = auth.uid()
  )
);
