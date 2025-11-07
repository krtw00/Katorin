const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../authMiddleware');
const { logger } = require('../config/logger');
const { strictLimiter } = require('../config/security');
const crypto = require('crypto');
const multer = require('multer');
const Papa = require('papaparse');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const createSlugFrom = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Register a new team
router.post('/register', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { name } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: 'チーム名は必須です。' });
  }

  const teamUsername = createSlugFrom(name);
  const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16文字のランダムなパスワード
  const teamEmail = `${teamUsername}@${req.user.id}.teams.local`; // チーム専用の疑似メールアドレス

  try {
    // Supabase Authにユーザーを登録
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: teamEmail,
      password: generatedPassword,
      email_confirm: true,
      app_metadata: { role: 'team', tournament_creator_id: req.user.id },
    });

    if (authError) {
      logger.error('Supabase Auth user creation error', { error: authError.message });
      return res.status(500).json({ error: authError.message });
    }

    const teamAuthUserId = authData.user.id;

    // Check if username already exists in teams table
    const { data: existingTeam, error: fetchError } = await client
      .from('teams')
      .select('id')
      .eq('username', teamUsername)
      .single();

    if (existingTeam) {
      // If team username already exists, delete the auth user created above
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(409).json({ error: 'このチーム名は既に使用されています。' });
    }
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      logger.error('Supabase fetch error', { error: fetchError.message });
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(500).json({ error: fetchError.message });
    }

    const { data, error } = await client
      .from('teams')
      .insert({
        name,
        username: teamUsername,
        created_by: req.user.id, // Link team to the creating admin user
        auth_user_id: teamAuthUserId, // Link team to the Supabase Auth user
      })
      .select('id, name, username, created_at')
      .single();

    if (error) {
      logger.error('Supabase insert error', { error: error.message });
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ ...data, generatedPassword });
  } catch (err) {
    logger.error('Unexpected error during team registration', { error: err.message });
    res.status(500).json({ error: 'チーム登録に失敗しました。' });
  }
});

// Team login (厳格なレート制限を適用)
// Supabase Auth方式: usernameからauth_user_idを取得し、そのemailでログイン
router.post('/login', strictLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'ユーザー名とパスワードは必須です。' });
  }

  try {
    // 1. usernameからteamsテーブルでauth_user_idを取得
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, username, auth_user_id')
      .eq('username', username)
      .single();

    if (teamError || !team || !team.auth_user_id) {
      logger.warn('Team login failed: team not found or missing auth_user_id', { username });
      return res.status(401).json({ error: '無効なユーザー名またはパスワードです。' });
    }

    // 2. auth_user_idからauth.usersのemailを取得
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(team.auth_user_id);

    if (authUserError || !authUser?.user?.email) {
      logger.error('Failed to get auth user for team login', {
        authUserId: team.auth_user_id,
        error: authUserError?.message
      });
      return res.status(401).json({ error: '無効なユーザー名またはパスワードです。' });
    }

    // 3. Supabase Authでログイン
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.user.email,
      password: password,
    });

    if (signInError || !signInData?.session) {
      logger.warn('Team login failed: invalid credentials', { username, email: authUser.user.email });
      return res.status(401).json({ error: '無効なユーザー名またはパスワードです。' });
    }

    // 4. Supabase Authのアクセストークンを返す
    res.status(200).json({
      teamId: team.id,
      name: team.name,
      username: team.username,
      token: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      expiresAt: signInData.session.expires_at,
    });
  } catch (err) {
    logger.error('Unexpected error during team login', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'チームログインに失敗しました。' });
  }
});

// Get all teams created by the authenticated user
router.get('/', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  try {
    const { data, error } = await client
      .from('teams')
      .select('id, name, username')
      .eq('created_by', req.user.id)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch teams', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    res.json(data ?? []);
  } catch (err) {
    logger.error('Unexpected error fetching teams', { error: err.message });
    res.status(500).json({ error: 'チームの取得に失敗しました。' });
  }
});

// Get a single team by ID
router.get('/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    const { data, error } = await client
      .from('teams')
      .select('id, name, username, created_at, updated_at')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();

    if (error || !data) {
      logger.warn('Team not found', { teamId: id, userId: req.user.id });
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }
    res.json(data);
  } catch (err) {
    logger.error('Unexpected error fetching team', { error: err.message, teamId: id });
    res.status(500).json({ error: 'チームの取得に失敗しました。' });
  }
});

// Update a team
router.put('/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const { name } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: 'チーム名は必須です。' });
  }

  const newUsername = createSlugFrom(name);

  try {
    // Check if the team belongs to the current user
    const { data: existingTeam, error: fetchError } = await client
      .from('teams')
      .select('username, auth_user_id')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !existingTeam) {
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    // Check if new username conflicts with another team
    if (newUsername !== existingTeam.username) {
      const { data: conflictTeam } = await client
        .from('teams')
        .select('id')
        .eq('username', newUsername)
        .neq('id', id)
        .single();
      if (conflictTeam) {
        return res.status(409).json({ error: 'このチーム名は既に使用されています。' });
      }

      // Update Supabase Auth user email if username changed
      if (existingTeam.auth_user_id) {
        const newEmail = `${newUsername}@${req.user.id}.teams.local`;
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          existingTeam.auth_user_id,
          { email: newEmail }
        );
        if (updateAuthError) {
          logger.error('Failed to update auth user email', { error: updateAuthError.message });
        }
      }
    }

    const { data, error } = await client
      .from('teams')
      .update({ name, username: newUsername, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, username, created_at, updated_at')
      .single();

    if (error) {
      logger.error('Failed to update team', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    logger.error('Unexpected error updating team', { error: err.message, teamId: id });
    res.status(500).json({ error: 'チームの更新に失敗しました。' });
  }
});

// Delete a team
router.delete('/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    // Get team auth_user_id before deleting
    const { data: team, error: fetchError } = await client
      .from('teams')
      .select('auth_user_id')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    // Delete team from database (cascades to participants)
    const { error } = await client
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete team', { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    // Delete Supabase Auth user
    if (team.auth_user_id) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(team.auth_user_id);
      if (deleteAuthError) {
        logger.error('Failed to delete auth user', { error: deleteAuthError.message });
      }
    }

    res.status(204).end();
  } catch (err) {
    logger.error('Unexpected error deleting team', { error: err.message, teamId: id });
    res.status(500).json({ error: 'チームの削除に失敗しました。' });
  }
});

// Export teams as CSV
router.get('/export', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  try {
    const { data: teams, error } = await client
      .from('teams')
      .select('id, name, username, created_at')
      .eq('created_by', req.user.id)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch teams for export', { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    const csv = Papa.unparse(teams);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="teams.csv"');
    res.send(csv);
  } catch (err) {
    logger.error('Unexpected error exporting teams', { error: err.message });
    res.status(500).json({ error: 'チームのエクスポートに失敗しました。' });
  }
});

// Import teams from CSV
router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'CSVファイルが必要です。' });
  }

  const csvContent = req.file.buffer.toString('utf-8');
  const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

  if (parseResult.errors.length > 0) {
    logger.warn('CSV parse errors', { errors: parseResult.errors });
    return res.status(400).json({ error: 'CSVファイルの解析に失敗しました。', details: parseResult.errors });
  }

  const rows = parseResult.data;
  if (rows.length === 0) {
    return res.status(400).json({ error: 'CSVファイルにデータがありません。' });
  }

  const imported = [];
  const errors = [];

  for (const row of rows) {
    const name = (row.name || '').toString().trim();
    if (!name) {
      errors.push({ row, error: 'チーム名が空です。' });
      continue;
    }

    const teamUsername = createSlugFrom(name);
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    const teamEmail = `${teamUsername}@${req.user.id}.teams.local`;

    try {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: teamEmail,
        password: generatedPassword,
        email_confirm: true,
        app_metadata: { role: 'team', tournament_creator_id: req.user.id },
      });

      if (authError) {
        errors.push({ row, error: authError.message });
        continue;
      }

      // Insert team
      const { data, error } = await client
        .from('teams')
        .insert({
          name,
          username: teamUsername,
          created_by: req.user.id,
          auth_user_id: authData.user.id,
        })
        .select('id, name, username')
        .single();

      if (error) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        errors.push({ row, error: error.message });
        continue;
      }

      imported.push({ ...data, generatedPassword });
    } catch (err) {
      logger.error('Error importing team row', { error: err.message, row });
      errors.push({ row, error: err.message });
    }
  }

  res.status(200).json({
    message: `${imported.length}件のチームをインポートしました。`,
    imported,
    errors: errors.length > 0 ? errors : undefined,
  });
});

module.exports = router;
