const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { logger } = require('../config/logger');
const { strictLimiter } = require('../config/security');
const crypto = require('crypto');
const multer = require('multer');
const Papa = require('papaparse');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const normalizeSlug = (value) => (value ?? '').toString().trim().toLowerCase();

const fetchTournamentForUser = async (client, userId, rawSlug) => {
  const normalizedSlug = normalizeSlug(rawSlug);
  if (!normalizedSlug) {
    return { error: 'トーナメントスラッグは必須です。' };
  }

  const { data, error } = await client
    .from('tournaments')
    .select('id, slug, name')
    .eq('created_by', userId)
    .ilike('slug', normalizedSlug)
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116' || !data) {
      return { error: '指定されたトーナメントが見つかりません。' };
    }
    logger.error('Failed to fetch tournament for user', {
      error: error?.message,
      slug: normalizedSlug,
      userId,
    });
    return { error: 'トーナメントの取得に失敗しました。' };
  }

  return { tournament: data };
};

const fetchTournamentByIdForUser = async (client, userId, tournamentId) => {
  if (!tournamentId) {
    return null;
  }
  const { data, error } = await client
    .from('tournaments')
    .select('id, slug, name')
    .eq('id', tournamentId)
    .eq('created_by', userId)
    .single();
  if (error || !data) {
    return null;
  }
  return data;
};

const findTournamentIdForTeamUser = async (client, userId) => {
  try {
    const { data, error } = await client
      .from('teams')
      .select('tournament_id')
      .eq('auth_user_id', userId)
      .single();
    if (error || !data?.tournament_id) {
      return null;
    }
    return data.tournament_id;
  } catch (err) {
    logger.error('Failed to infer tournament id from team', { error: err.message, userId });
    return null;
  }
};

const resolveTournamentContext = async (client, req, { slugParam, idParam } = {}) => {
  const slug = typeof slugParam === 'string' ? slugParam : undefined;
  const id = typeof idParam === 'string' ? idParam : undefined;

  if (slug) {
    return fetchTournamentForUser(client, req.user.id, slug);
  }

  if (id) {
    const tournament = await fetchTournamentByIdForUser(client, req.user.id, id);
    if (!tournament) {
      return { error: '指定されたトーナメントが見つかりません。' };
    }
    return { tournament };
  }

  const metadata = req.user?.app_metadata ?? {};
  if (metadata.tournament_id) {
    return {
      tournament: {
        id: metadata.tournament_id,
        slug: metadata.tournament_slug ?? null,
        name: metadata.tournament_name ?? null,
      },
    };
  }

  if (metadata.tournament_slug) {
    const inferredId = await findTournamentIdForTeamUser(client, req.user.id);
    if (inferredId) {
      return {
        tournament: {
          id: inferredId,
          slug: metadata.tournament_slug,
        },
      };
    }
  }

  const inferredId = await findTournamentIdForTeamUser(client, req.user.id);
  if (inferredId) {
    return {
      tournament: {
        id: inferredId,
        slug: null,
      },
    };
  }

  return { error: 'トーナメントを指定してください。' };
};

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
  const { name, tournament_slug } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: 'チーム名は必須です。' });
  }

  if (!tournament_slug) {
    return res.status(400).json({ error: 'トーナメントスラッグは必須です。' });
  }

  const { tournament, error: tournamentError } = await fetchTournamentForUser(client, req.user.id, tournament_slug);
  if (!tournament) {
    return res.status(400).json({ error: tournamentError });
  }

  const teamUsername = createSlugFrom(name);
  const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16文字のランダムなパスワード
  // メールフォーマットを統一: {username}@{tournamentSlug}.players.local
  const teamEmail = `${teamUsername}@${tournament.slug}.players.local`;

  try {
    // Supabase Authにユーザーを登録
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: teamEmail,
      password: generatedPassword,
      email_confirm: true,
      app_metadata: {
        role: 'team',
        tournament_slug: tournament.slug,
        tournament_id: tournament.id,
        tournament_creator_id: req.user.id,
      },
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
        tournament_id: tournament.id,
      })
      .select('id, name, username, created_at, tournament_id')
      .single();

    if (error) {
      logger.error('Supabase insert error', { error: error.message });
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ ...data, tournament_slug: tournament.slug, generatedPassword });
  } catch (err) {
    logger.error('Unexpected error during team registration', { error: err.message });
    res.status(500).json({ error: 'チーム登録に失敗しました。' });
  }
});

// ⚠️ NOTE: Team login is now handled by Supabase Auth directly via LoginForm.tsx
// The client-side calls signInWithPassword with email format: {username}@{tournamentSlug}.players.local
// This endpoint is DEPRECATED and kept only for backward compatibility
// TODO: Remove this endpoint in v2.0
//
// router.post('/login', strictLimiter, async (req, res) => {
//   // DEPRECATED: Use Supabase Auth signInWithPassword instead
//   return res.status(410).json({ error: 'Team login via this endpoint is deprecated. Use Supabase Auth directly.' });
// });

// Get all teams created by the authenticated user
router.get('/', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  try {
    const { tournament, error: tournamentError } = await resolveTournamentContext(client, req, {
      slugParam: req.query?.tournament_slug,
      idParam: req.query?.tournament_id,
    });
    if (!tournament?.id) {
      return res.status(400).json({ error: tournamentError ?? 'トーナメントを指定してください。' });
    }

    const { data, error } = await client
      .from('teams')
      .select('id, name, username, created_at, tournament_id')
      .eq('created_by', req.user.id)
      .eq('tournament_id', tournament.id)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch teams', { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    const legacyTeamIds = (data ?? [])
      .filter((team) => !team.tournament_id)
      .map((team) => team.id);

    if (legacyTeamIds.length > 0) {
      const { error: backfillError } = await client
        .from('teams')
        .update({ tournament_id: tournament.id })
        .in('id', legacyTeamIds);

      if (backfillError) {
        logger.error('Failed to backfill tournament_id for teams', { error: backfillError.message });
      } else {
        data?.forEach((team) => {
          if (!team.tournament_id) {
            team.tournament_id = tournament.id;
          }
        });
      }
    }

    const response = (data ?? []).map((team) => ({
      ...team,
      tournament_slug: tournament.slug,
    }));
    res.json(response);
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
  const { name, tournament_slug: bodyTournamentSlug } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: 'チーム名は必須です。' });
  }

  const newUsername = createSlugFrom(name);

  try {
    // Check if the team belongs to the current user
    const { data: existingTeam, error: fetchError } = await client
      .from('teams')
      .select('username, auth_user_id, tournament_id')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !existingTeam) {
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    let effectiveTournament = null;
    if (existingTeam.tournament_id) {
      effectiveTournament = await fetchTournamentByIdForUser(client, req.user.id, existingTeam.tournament_id);
    } else {
      const { tournament, error: tournamentError } = await resolveTournamentContext(client, req, {
        slugParam: bodyTournamentSlug,
      });
      if (!tournament?.id) {
        return res.status(400).json({ error: tournamentError ?? 'トーナメントを指定してください。' });
      }
      const { error: assignError } = await client
        .from('teams')
        .update({ tournament_id: tournament.id })
        .eq('id', id)
        .eq('created_by', req.user.id);
      if (assignError) {
        logger.error('Failed to assign tournament to team', { error: assignError.message, teamId: id });
        return res.status(500).json({ error: 'チームの更新に失敗しました。' });
      }
      existingTeam.tournament_id = tournament.id;
      effectiveTournament = tournament;
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
      if (existingTeam.auth_user_id && effectiveTournament?.slug) {
        const newEmail = `${newUsername}@${effectiveTournament.slug}.players.local`;
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
    const { tournament, error: tournamentError } = await resolveTournamentContext(client, req, {
      slugParam: req.query?.tournament_slug,
      idParam: req.query?.tournament_id,
    });
    if (!tournament?.id) {
      return res.status(400).json({ error: tournamentError ?? 'トーナメントを指定してください。' });
    }

    const { data: teams, error } = await client
      .from('teams')
      .select('id, name, username, created_at')
      .eq('created_by', req.user.id)
      .eq('tournament_id', tournament.id)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch teams for export', { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    const csv = Papa.unparse(teams);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="teams-${tournament.slug}.csv"`);
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

  const { tournament_slug } = req.body ?? {};
  if (!tournament_slug) {
    return res.status(400).json({ error: 'トーナメントスラッグは必須です。' });
  }

  const { tournament, error: tournamentError } = await fetchTournamentForUser(client, req.user.id, tournament_slug);
  if (!tournament) {
    return res.status(400).json({ error: tournamentError });
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
    // メールフォーマットを統一: {username}@{tournamentSlug}.players.local
    const teamEmail = `${teamUsername}@${tournament.slug}.players.local`;

    try {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: teamEmail,
        password: generatedPassword,
        email_confirm: true,
        app_metadata: {
          role: 'team',
          tournament_slug: tournament.slug,
          tournament_id: tournament.id,
          tournament_creator_id: req.user.id,
        },
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
          tournament_id: tournament.id,
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
