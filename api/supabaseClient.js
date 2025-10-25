const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// ローカル開発時に .env / .env.local / supabase/.env を順番に読み込む
const envFiles = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../supabase/.env'),
];

for (const envPath of envFiles) {
  dotenv.config({ path: envPath, override: false });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase の接続情報 (SUPABASE_URL / SUPABASE_ANON_KEY) が設定されていません。');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

module.exports = { supabase };
