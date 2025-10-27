-- 既存の大会データを特定のユーザー(913e1de5-a4c6-40de-9391-7de9c9877c7f)に紐づける
--
-- このマイグレーションは、created_byがNULLの全ての大会データを
-- 指定されたユーザーIDに紐づけます。

-- まず、対象となる大会を確認(ログ出力用)
DO $$
DECLARE
  tournament_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tournament_count
  FROM public.tournaments
  WHERE created_by IS NULL;

  RAISE NOTICE '紐づけ対象の大会数: %', tournament_count;
END $$;

-- created_byがNULLの全ての大会を指定ユーザーに紐づける
UPDATE public.tournaments
SET created_by = '913e1de5-a4c6-40de-9391-7de9c9877c7f'
WHERE created_by IS NULL;

-- 結果を確認(ログ出力用)
DO $$
DECLARE
  user_tournament_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_tournament_count
  FROM public.tournaments
  WHERE created_by = '913e1de5-a4c6-40de-9391-7de9c9877c7f';

  RAISE NOTICE 'ユーザー 913e1de5-a4c6-40de-9391-7de9c9877c7f に紐づいた大会数: %', user_tournament_count;
END $$;
