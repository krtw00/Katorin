const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../authMiddleware');
const { logger } = require('../config/logger');

const createSlugFrom = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Get all tournaments for authenticated user
router.get('/', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { data, error } = await client
    .from('tournaments')
    .select('id, name, slug, description, created_at')
    .eq('created_by', req.user.id)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('Failed to fetch tournaments', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new tournament (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
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
      logger.error('Failed to create tournament', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    logger.error('Unexpected error creating tournament', { error: err.message });
    res.status(500).json({ error: '大会の作成に失敗しました。' });
  }
});

// List rounds for a tournament
router.get('/:tournamentId/rounds', requireAuth, async (req, res) => {
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
    logger.error('Failed to fetch rounds', { error: error.message, tournamentId });
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new round (admin only)
router.post('/:tournamentId/rounds', requireAuth, requireAdmin, async (req, res) => {
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
    logger.error('Failed to fetch latest round', { error: latestError.message, tournamentId });
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
    logger.error('Failed to create round', { error: error.message, tournamentId });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Close a round (admin only)
router.post('/:tournamentId/rounds/:roundId/close', requireAuth, requireAdmin, async (req, res) => {
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
    logger.error('Failed to fetch round', { error: fetchError.message, roundId });
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
    logger.error('Failed to close round', { error: error.message, roundId });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Reopen a round (admin only, only latest closed round)
router.post('/:tournamentId/rounds/:roundId/reopen', requireAuth, requireAdmin, async (req, res) => {
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
    logger.error('Failed to fetch rounds for reopen', { error: fetchError.message, tournamentId });
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
    logger.error('Failed to reopen round', { error: error.message, roundId });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

module.exports = router;
