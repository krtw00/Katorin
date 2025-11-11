const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminOrEditor, attachTeam } = require('../middleware/authMiddleware');
const { logger } = require('../config/logger');

// --- Team Self-Service Endpoints (with attachTeam) ---

// Get participants for authenticated team
router.get('/team/participants', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  try {
    const { data, error } = await client
      .from('participants')
      .select('id, team_id, name, can_edit, created_at, updated_at')
      .eq('team_id', req.team.id)
      .order('name', { ascending: true });
    if (error) {
      logger.error('Failed to fetch team participants', { error: error.message, teamId: req.team.id });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data ?? []);
  } catch (err) {
    logger.error('Unexpected error fetching team participants', { error: err.message });
    return res.status(500).json({ error: '参加者の取得に失敗しました。' });
  }
});

// Create participant for authenticated team
router.post('/team/participants', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const name = req.body?.name ? String(req.body.name).trim() : '';
  const canEdit = Boolean(req.body?.canEdit ?? req.body?.can_edit ?? false);
  if (!name) {
    return res.status(400).json({ error: '参加者名は必須です。' });
  }
  try {
    const { data, error } = await client
      .from('participants')
      .insert({ team_id: req.team.id, name, can_edit: canEdit, created_by: req.team.created_by })
      .select('id, team_id, name, can_edit, created_at, updated_at')
      .single();
    if (error) {
      logger.error('Failed to create team participant', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  } catch (err) {
    logger.error('Unexpected error creating team participant', { error: err.message });
    return res.status(500).json({ error: '参加者の追加に失敗しました。' });
  }
});

// Update participant (owned by authenticated team)
router.put('/team/participants/:id', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const name = req.body?.name ? String(req.body.name).trim() : undefined;
  const canEdit = req.body?.canEdit ?? req.body?.can_edit;
  try {
    const { data: participant, error: fetchError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();
    if (fetchError || !participant) {
      logger.warn('Participant not found for update', { participantId: id });
      return res.status(404).json({ error: '参加者が見つかりません。' });
    }
    if (participant.team_id !== req.team.id) {
      return res.status(403).json({ error: 'この参加者を更新する権限がありません。' });
    }
    const updatePayload = {};
    if (typeof name === 'string' && name.length > 0) updatePayload.name = name;
    if (typeof canEdit === 'boolean') updatePayload.can_edit = canEdit;
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: '更新するデータがありません。' });
    }
    const { data, error } = await client
      .from('participants')
      .update(updatePayload)
      .eq('id', id)
      .select('id, team_id, name, can_edit, created_at, updated_at')
      .single();
    if (error) {
      logger.error('Failed to update team participant', { error: error.message, participantId: id });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  } catch (err) {
    logger.error('Unexpected error updating team participant', { error: err.message, participantId: id });
    return res.status(500).json({ error: '参加者の更新に失敗しました。' });
  }
});

// Delete participant (owned by authenticated team)
router.delete('/team/participants/:id', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    const { data: participant, error: fetchError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();
    if (fetchError || !participant) {
      logger.warn('Participant not found for delete', { participantId: id });
      return res.status(404).json({ error: '参加者が見つかりません。' });
    }
    if (participant.team_id !== req.team.id) {
      return res.status(403).json({ error: 'この参加者を削除する権限がありません。' });
    }
    const { error } = await client.from('participants').delete().eq('id', id);
    if (error) {
      logger.error('Failed to delete team participant', { error: error.message, participantId: id });
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).send();
  } catch (err) {
    logger.error('Unexpected error deleting team participant', { error: err.message, participantId: id });
    return res.status(500).json({ error: '参加者の削除に失敗しました。' });
  }
});

// --- Admin Endpoints (per team) ---

// Get participants for a specific team (admin)
router.get('/admin/teams/:teamId/participants', requireAuth, requireAdminOrEditor, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { teamId } = req.params;

  try {
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      logger.warn('Team not found for participants fetch', { teamId });
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を閲覧する権限がありません。' });
    }

    const { data, error } = await client
      .from('participants')
      .select('id, name, can_edit, created_at')
      .eq('team_id', teamId)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch participants for team', { error: error.message, teamId });
      return res.status(500).json({ error: error.message });
    }

    return res.json(data ?? []);
  } catch (err) {
    logger.error('Unexpected error fetching team participants (admin)', { error: err.message, teamId });
    return res.status(500).json({ error: '参加者の取得に失敗しました。' });
  }
});

// Add a participant to a team as the creator (admin)
router.post('/admin/teams/:teamId/participants', requireAuth, requireAdminOrEditor, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { teamId } = req.params;
  const { name, can_edit } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: '参加者名は必須です。' });
  }

  try {
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      logger.warn('Team not found for participant creation', { teamId });
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を追加する権限がありません。' });
    }

    const { data, error } = await client
      .from('participants')
      .insert({
        team_id: teamId,
        name,
        can_edit: Boolean(can_edit),
        created_by: req.user.id,
      })
      .select('id, name, can_edit, created_at')
      .single();

    if (error || !data) {
      logger.error('Failed to create participant (admin)', { error: error?.message });
      return res.status(500).json({ error: error?.message ?? '参加者の追加に失敗しました。' });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.error('Unexpected error creating participant (admin)', { error: err.message, teamId });
    return res.status(500).json({ error: '参加者の追加に失敗しました。' });
  }
});

// Update a participant as the team creator (admin)
router.put('/admin/participants/:id', requireAuth, requireAdminOrEditor, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const { name, can_edit, team_id: newTeamId } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: '参加者名は必須です。' });
  }

  try {
    const { data: participant, error: participantError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (participantError || !participant) {
      logger.warn('Participant not found for update (admin)', { participantId: id });
      return res.status(404).json({ error: '参加者が見つかりません。' });
    }

    const targetTeamId = newTeamId ?? participant.team_id;

    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', targetTeamId)
      .single();

    if (teamError || !team) {
      logger.warn('Team not found for participant update (admin)', { teamId: targetTeamId });
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を更新する権限がありません。' });
    }

    const updatePayload = {
      name,
      can_edit: Boolean(can_edit),
      team_id: targetTeamId,
    };

    const { data, error } = await client
      .from('participants')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, can_edit, team_id, created_at')
      .single();

    if (error || !data) {
      logger.error('Failed to update participant (admin)', { error: error?.message, participantId: id });
      return res.status(500).json({ error: error?.message ?? '参加者の更新に失敗しました。' });
    }

    return res.json(data);
  } catch (err) {
    logger.error('Unexpected error updating participant (admin)', { error: err.message, participantId: id });
    return res.status(500).json({ error: '参加者の更新に失敗しました。' });
  }
});

// Delete a participant as the team creator (admin)
router.delete('/admin/participants/:id', requireAuth, requireAdminOrEditor, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;

  try {
    const { data: participant, error: participantError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (participantError || !participant) {
      logger.warn('Participant not found for delete (admin)', { participantId: id });
      return res.status(404).json({ error: '参加者が見つかりません。' });
    }

    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', participant.team_id)
      .single();

    if (teamError || !team) {
      logger.warn('Team not found for participant delete (admin)', { teamId: participant.team_id });
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を削除する権限がありません。' });
    }

    const { error } = await client.from('participants').delete().eq('id', id);

    if (error) {
      logger.error('Failed to delete participant (admin)', { error: error.message, participantId: id });
      return res.status(500).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    logger.error('Unexpected error deleting participant (admin)', { error: err.message, participantId: id });
    return res.status(500).json({ error: '参加者の削除に失敗しました。' });
  }
});

module.exports = router;
