import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase の接続情報 (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY) が設定されていません。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
