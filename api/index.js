const express = require('express');
const { supabase, supabaseAdmin } = require('./supabaseClient');
const { requireAuth, requireAdmin } = require('./authMiddleware');

const createSlugFrom = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// Get all matches for a tournament (optionally filtered by round)
app.get('/api/matches', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId } = req.query;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId を指定してください。' });
  }
  let query = client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('date', { ascending: false });
  if (roundId) {
    query = query.eq('round_id', roundId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/matches] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Get match by id
app.get('/api/matches/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { data, error } = await client
    .from('matches')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) {
    console.error('[GET /api/matches/:id] Supabase error:', error);
    return res.status(404).json({ error: error.message });
  }
  res.json(data);
});

// Create a new match
app.post('/api/matches', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId, ...rest } = req.body ?? {};
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId を指定してください。' });
  }
  if (!roundId) {
    return res.status(400).json({ error: 'roundId を指定してください。' });
  }
  const { data, error } = await client
    .from('matches')
    .insert({
      ...rest,
      tournament_id: tournamentId,
      round_id: roundId,
    })
    .select()
    .single();
  if (error) {
    console.error('[POST /api/matches] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Update a match
app.put('/api/matches/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId, ...rest } = req.body ?? {};
  const updatePayload = {
    ...rest,
  };
  if (roundId) {
    updatePayload.round_id = roundId;
  }
  if (tournamentId) {
    updatePayload.tournament_id = tournamentId;
  }
  const { data, error } = await client
    .from('matches')
    .update(updatePayload)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[PUT /api/matches/:id] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Delete a match
app.delete('/api/matches/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { data, error } = await client
    .from('matches')
    .delete()
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[DELETE /api/matches/:id] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// List tournaments (public)
app.get('/api/tournaments', async (_req, res) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, slug, description, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[GET /api/tournaments] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new tournament (admin only)
app.post('/api/tournaments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description } = req.body ?? {};
    const normalizedName = (name ?? '').toString().trim();
    if (!normalizedName) {
      return res.status(400).json({ error: '大会名を入力してください。' });
    }

    const baseSlug = slug ? slug.toString() : normalizedName;
    const normalizedSlug = createSlugFrom(baseSlug);
    if (!normalizedSlug) {
      return res
        .status(400)
        .json({ error: 'スラッグは半角英数字とハイフンのみ使用できます。' });
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return res
        .status(400)
        .json({ error: 'スラッグは半角英数字とハイフンのみ使用できます。' });
    }

    const client = req.supabase;
    if (!client) {
      return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
    }
    const { data, error } = await client
      .from('tournaments')
      .insert({
        name: normalizedName,
        slug: normalizedSlug,
        description: description ? description.toString().trim() || null : null,
        created_by: req.user.id,
      })
      .select('id, name, slug, description, created_at')
      .single();
    if (error) {
      console.error('[POST /api/tournaments] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /api/tournaments] Unexpected error:', err);
    res.status(500).json({ error: '大会の作成に失敗しました。' });
  }
});

// List rounds for a tournament
app.get('/api/tournaments/:tournamentId/rounds', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId } = req.params;
  const { data, error } = await client
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: true });
  if (error) {
    console.error('[GET /api/tournaments/:id/rounds] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new round (admin only)
app.post('/api/tournaments/:tournamentId/rounds', requireAuth, requireAdmin, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId } = req.params;
  const title = req.body?.title ? req.body.title.toString().trim() : null;

  const { data: latestRounds, error: latestError } = await client
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: false })
    .limit(1);
  if (latestError) {
    console.error('[POST /api/tournaments/:id/rounds] fetch latest error:', latestError);
    return res.status(500).json({ error: latestError.message });
  }

  const latestRound = latestRounds?.[0];
  if (latestRound && latestRound.status !== 'closed') {
    return res.status(400).json({ error: '前のラウンドを締めてから次のラウンドを作成してください。' });
  }

  const nextNumber = latestRound ? latestRound.number + 1 : 1;
  const { data, error } = await client
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      number: nextNumber,
      title: title && title.length > 0 ? title : null,
      status: 'open',
    })
    .select('*')
    .single();
  if (error) {
    console.error('[POST /api/tournaments/:id/rounds] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Close a round (admin only)
app.post('/api/tournaments/:tournamentId/rounds/:roundId/close', requireAuth, requireAdmin, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId } = req.params;
  const { data: round, error: fetchError } = await client
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .eq('tournament_id', tournamentId)
    .single();
  if (fetchError) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/close] fetch error:', fetchError);
    return res.status(404).json({ error: '指定されたラウンドが見つかりません。' });
  }
  if (round.status === 'closed') {
    return res.status(400).json({ error: 'このラウンドは既に締め切られています。' });
  }
  const { data, error } = await client
    .from('rounds')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', roundId)
    .eq('tournament_id', tournamentId)
    .select('*')
    .single();
  if (error) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/close] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Reopen a round (admin only, only latest closed round)
app.post('/api/tournaments/:tournamentId/rounds/:roundId/reopen', requireAuth, requireAdmin, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId } = req.params;

  const { data: rounds, error: fetchError } = await client
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: false })
    .limit(2);
  if (fetchError) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/reopen] fetch error:', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }
  const targetRound = rounds?.find((round) => round.id === roundId);
  if (!targetRound) {
    return res.status(404).json({ error: '指定されたラウンドが見つかりません。' });
  }
  if (targetRound.status !== 'closed') {
    return res.status(400).json({ error: 'このラウンドは締め切られていません。' });
  }
  const latestRound = rounds?.[0];
  if (!latestRound || latestRound.id !== targetRound.id) {
    return res.status(400).json({ error: '新しいラウンドが追加済みのため、再開できません。' });
  }

  const { data, error } = await client
    .from('rounds')
    .update({
      status: 'open',
      closed_at: null,
    })
    .eq('id', roundId)
    .eq('tournament_id', tournamentId)
    .select('*')
    .single();
  if (error) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/reopen] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Create an admin user (admin only, requires service role key)
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res
      .status(500)
      .json({ error: 'SERVICE ROLE KEY が設定されていないため管理者ユーザーを作成できません。' });
  }

  const { email, password, displayName } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'メールアドレスを入力してください。' });
  }
  if (!normalizedPassword || normalizedPassword.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上で入力してください。' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: displayName ? { displayName } : undefined,
      app_metadata: { role: 'admin' },
    });
    if (error) {
      console.error('[POST /api/admin/users] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    if (!data?.user) {
      return res.status(500).json({ error: 'ユーザーの作成に失敗しました。' });
    }
    res.status(201).json({
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
    });
  } catch (err) {
    console.error('[POST /api/admin/users] Unexpected error:', err);
    res.status(500).json({ error: '管理者ユーザーの作成に失敗しました。' });
  }
});

// Export the app for Vercel
module.exports = app;
