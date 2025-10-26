const { createClient } = require('@supabase/supabase-js');

// Vercel環境では環境変数が自動で設定されるため、dotenvはローカル開発時のみ使用
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  const dotenv = require('dotenv');

  const envFiles = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../supabase/.env'),
  ];

  for (const envPath of envFiles) {
    dotenv.config({ path: envPath, override: false });
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase の接続情報 (SUPABASE_URL / SUPABASE_ANON_KEY) が設定されていません。');
}

const baseClientOptions = {
  auth: {
    persistSession: false,
  },
};

const supabase = createClient(supabaseUrl, supabaseAnonKey, baseClientOptions);

const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, baseClientOptions)
  : null;

const createSupabaseClientForToken = (accessToken) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    ...baseClientOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

module.exports = { supabase, supabaseAdmin, createSupabaseClientForToken };
