const express = require('express');
const router = express.Router();
const { requireAuth, attachTeam } = require('../authMiddleware');
const { logger } = require('../config/logger');

// --- Team-specific Match Endpoints ---

// Get all matches for authenticated team
router.get('/team/matches', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  try {
    const { data, error } = await client
      .from('matches')
      .select('*')
      .eq('team_id', req.team.id)
      .order('date', { ascending: false });
    if (error) {
      logger.error('Failed to fetch team matches', { error: error.message, teamId: req.team.id });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data ?? []);
  } catch (err) {
    logger.error('Unexpected error fetching team matches', { error: err.message });
    return res.status(500).json({ error: '試合結果の取得に失敗しました。' });
  }
});

// Create match for authenticated team
router.post('/team/matches', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const body = req.body ?? {};
  const tournamentId = body.tournamentId ?? body.tournament_id;
  const roundId = body.roundId ?? body.round_id;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId を指定してください。' });
  }
  if (!roundId) {
    return res.status(400).json({ error: 'roundId を指定してください。' });
  }
  const insertPayload = {
    player: body.player ?? null,
    deck: body.deck ?? null,
    selfScore: body.selfScore ?? null,
    opponentScore: body.opponentScore ?? null,
    opponentTeam: body.opponentTeam ?? null,
    opponentPlayer: body.opponentPlayer ?? null,
    opponentDeck: body.opponentDeck ?? null,
    date: body.date ?? null,
    tournament_id: tournamentId,
    round_id: roundId,
    team_id: req.team.id,
  };
  try {
    const { data, error } = await client
      .from('matches')
      .insert(insertPayload)
      .select('*')
      .single();
    if (error) {
      logger.error('Failed to create team match', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  } catch (err) {
    logger.error('Unexpected error creating team match', { error: err.message });
    return res.status(500).json({ error: '試合結果の作成に失敗しました。' });
  }
});

// Update match for authenticated team
router.put('/team/matches/:id', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const body = req.body ?? {};
  try {
    const { data: match, error: fetchError } = await client
      .from('matches')
      .select('id, team_id, result_status')
      .eq('id', id)
      .single();
    if (fetchError || !match) {
      logger.warn('Team match not found for update', { matchId: id });
      return res.status(404).json({ error: '試合結果が見つかりません。' });
    }
    if (match.team_id !== req.team.id) {
      return res.status(403).json({ error: 'この試合結果を更新する権限がありません。' });
    }
    if (match.result_status === 'finalized') {
      return res.status(409).json({ error: 'この試合結果は確定済みのため編集できません。' });
    }
    const updatePayload = {};
    const m = body;
    if ('player' in m) updatePayload.player = m.player;
    if ('deck' in m) updatePayload.deck = m.deck;
    if ('selfScore' in m) updatePayload.selfScore = m.selfScore;
    if ('opponentScore' in m) updatePayload.opponentScore = m.opponentScore;
    if ('opponentTeam' in m) updatePayload.opponentTeam = m.opponentTeam;
    if ('opponentPlayer' in m) updatePayload.opponentPlayer = m.opponentPlayer;
    if ('opponentDeck' in m) updatePayload.opponentDeck = m.opponentDeck;
    if ('date' in m) updatePayload.date = m.date;
    if ('tournamentId' in m || 'tournament_id' in m) updatePayload.tournament_id = m.tournamentId ?? m.tournament_id;
    if ('roundId' in m || 'round_id' in m) updatePayload.round_id = m.roundId ?? m.round_id;
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: '更新するデータがありません。' });
    }
    const { data, error } = await client
      .from('matches')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      logger.error('Failed to update team match', { error: error.message, matchId: id });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  } catch (err) {
    logger.error('Unexpected error updating team match', { error: err.message, matchId: id });
    return res.status(500).json({ error: '試合結果の更新に失敗しました。' });
  }
});

// Result input with permission and lock control
// POST /api/team/matches/:id/result
// body: { action: 'save' | 'finalize' | 'cancel', payload?: { ...既存の試合フィールド... } }
router.post('/team/matches/:id/result', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const { action, payload } = req.body ?? {};

  if (!['save', 'finalize', 'cancel'].includes(action)) {
    return res.status(400).json({ error: 'action は save / finalize / cancel のいずれかを指定してください。' });
  }

  try {
    const { data: match, error: fetchError } = await client
      .from('matches')
      .select('id, team_id, input_allowed_team_id, result_status, locked_by, locked_at')
      .eq('id', id)
      .single();

    if (fetchError || !match) {
      logger.warn('Match not found for result input', { matchId: id });
      return res.status(404).json({ error: '試合結果が見つかりません。' });
    }

    // 入力可否: NULL=不可, 'admin'=管理者のみ, uuid文字列=そのチームのみ
    if (!match.input_allowed_team_id) {
      return res.status(403).json({ error: 'この試合は現在、結果入力が許可されていません。' });
    }
    if (match.input_allowed_team_id === 'admin') {
      // チームAPIでは管理者指定は不可。管理者UI/エンドポイントで実施。
      return res.status(403).json({ error: 'この試合は運営のみが入力可能です。' });
    }
    if (match.input_allowed_team_id !== req.team.id) {
      return res.status(403).json({ error: 'この試合結果を入力する権限がありません。' });
    }

    // 既に確定済みの場合は編集不可
    if (match.result_status === 'finalized' && action !== 'cancel') {
      return res.status(409).json({ error: 'この試合結果は既に確定されています。' });
    }

    // 簡易ロック: 他者がロック中か
    if (match.locked_by && match.locked_by !== req.team.id && action !== 'cancel') {
      return res.status(409).json({ error: '他のクライアントが編集中です。しばらくしてから再度お試しください。' });
    }

    const updatePayload = {};

    if (action === 'cancel') {
      // ロック解除のみ（またはドラフトへ戻す）
      updatePayload.locked_by = null;
      updatePayload.locked_at = null;
      // ドラフトへ戻す操作は明示リクエスト時のみとし、ここでは状態は維持
      const { data, error } = await client
        .from('matches')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        logger.error('Failed to cancel match result', { error: error.message, matchId: id });
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    }

    // save / finalize の場合はフィールド更新を許可
    if (payload && typeof payload === 'object') {
      const m = payload;
      if ('team' in m) updatePayload.team = m.team;
      if ('player' in m) updatePayload.player = m.player;
      if ('deck' in m) updatePayload.deck = m.deck;
      if ('selfScore' in m) updatePayload.selfScore = m.selfScore;
      if ('opponentScore' in m) updatePayload.opponentScore = m.opponentScore;
      if ('opponentTeam' in m) updatePayload.opponentTeam = m.opponentTeam;
      if ('opponentPlayer' in m) updatePayload.opponentPlayer = m.opponentPlayer;
      if ('opponentDeck' in m) updatePayload.opponentDeck = m.opponentDeck;
      if ('date' in m) updatePayload.date = m.date;
    }

    if (action === 'save') {
      updatePayload.result_status = 'draft';
      updatePayload.locked_by = req.team.id;
      updatePayload.locked_at = new Date().toISOString();
    } else if (action === 'finalize') {
      updatePayload.result_status = 'finalized';
      updatePayload.locked_by = null;
      updatePayload.locked_at = null;
      updatePayload.finalized_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('matches')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      logger.error('Failed to save/finalize match result', { error: error.message, matchId: id, action });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  } catch (err) {
    logger.error('Unexpected error during result input', { error: err.message, matchId: id });
    return res.status(500).json({ error: '試合結果の更新に失敗しました。' });
  }
});

// Delete match for authenticated team
router.delete('/team/matches/:id', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    const { data: match, error: fetchError } = await client
      .from('matches')
      .select('id, team_id')
      .eq('id', id)
      .single();
    if (fetchError || !match) {
      logger.warn('Team match not found for delete', { matchId: id });
      return res.status(404).json({ error: '試合結果が見つかりません。' });
    }
    if (match.team_id !== req.team.id) {
      return res.status(403).json({ error: 'この試合結果を削除する権限がありません。' });
    }
    const { error } = await client.from('matches').delete().eq('id', id);
    if (error) {
      logger.error('Failed to delete team match', { error: error.message, matchId: id });
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).send();
  } catch (err) {
    logger.error('Unexpected error deleting team match', { error: err.message, matchId: id });
    return res.status(500).json({ error: '試合結果の削除に失敗しました。' });
  }
});

// --- Admin Match Endpoints ---

// Get all matches for a tournament (optionally filtered by round)
router.get('/', requireAuth, async (req, res) => {
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
    logger.error('Failed to fetch matches', { error: error.message, tournamentId, roundId });
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Get match by id
router.get('/:id', requireAuth, async (req, res) => {
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
    logger.warn('Match not found', { matchId: req.params.id });
    return res.status(404).json({ error: error.message });
  }
  res.json(data);
});

// Create a new match
router.post('/', requireAuth, async (req, res) => {
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
    logger.error('Failed to create match', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Update a match
router.put('/:id', requireAuth, async (req, res) => {
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
    logger.error('Failed to update match', { error: error.message, matchId: req.params.id });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Delete a match
router.delete('/:id', requireAuth, async (req, res) => {
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
    logger.error('Failed to delete match', { error: error.message, matchId: req.params.id });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

module.exports = router;
