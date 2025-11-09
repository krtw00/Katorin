const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabaseClient');
const { requireAuth, requireAdmin, attachTeam } = require('../middleware/authMiddleware');
const { logger } = require('../config/logger');

// Get current team info (for team users)
router.get('/team/me', requireAuth, attachTeam, async (req, res) => {
  try {
    res.json(req.team);
  } catch (err) {
    logger.error('Unexpected error fetching team info', { error: err.message });
    res.status(500).json({ error: 'チーム情報の取得に失敗しました。' });
  }
});

// Get current team user summary (with can_edit flag)
router.get('/team/current-user', requireAuth, attachTeam, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }

  try {
    const { data: editors, error } = await client
      .from('participants')
      .select('id')
      .eq('team_id', req.team.id)
      .eq('can_edit', true)
      .limit(1);

    if (error) {
      logger.error('Failed to resolve team can_edit flag', { error: error.message, teamId: req.team.id });
      return res.status(500).json({ error: 'チーム権限の確認に失敗しました。' });
    }

    const response = {
      id: req.team.id,
      name: req.team.name,
      username: req.team.username,
      can_edit: Array.isArray(editors) && editors.length > 0,
      tournament_id: req.team.tournament_id ?? null,
      created_at: req.team.created_at,
    };

    res.json(response);
  } catch (err) {
    logger.error('Unexpected error fetching current team user', { error: err.message });
    res.status(500).json({ error: 'チーム情報の取得に失敗しました。' });
  }
});

// Request password reset email
router.post('/password-reset', async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'メールアドレスを入力してください。' });
  }

  try {
    // Supabaseの認証機能を使ってパスワードリセットメールを送信
    const redirectUrl = process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3000/password-reset';
    logger.info('Password reset requested', { redirectUrl, nodeEnv: process.env.NODE_ENV });

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      logger.error('Password reset email send failed', { error: error.message });

      // レート制限エラーの場合は具体的なメッセージを返す
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
        return res.status(429).json({
          error: 'パスワードリセットメールの送信回数が上限に達しました。しばらく時間をおいてから再度お試しください。'
        });
      }

      // その他のエラーは汎用的なメッセージを返す（セキュリティのため）
      return res.status(500).json({ error: 'パスワードリセットメールの送信に失敗しました。' });
    }

    res.status(200).json({
      message: 'パスワードリセットのリンクを生成しました。',
    });
  } catch (err) {
    logger.error('Unexpected error during password reset', { error: err.message });
    res.status(500).json({ error: 'パスワードリセット処理中に予期せぬエラーが発生しました。' });
  }
});

// Create an admin user (admin only, requires service role key)
router.post('/admin/users', async (req, res) => {
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
      logger.error('Failed to create admin user', { error: error.message });
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
    logger.error('Unexpected error creating admin user', { error: err.message });
    res.status(500).json({ error: '管理者ユーザーの作成に失敗しました。' });
  }
});

// Reset user password (admin only)
router.post('/admin/users/:userId/reset-password', requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res
      .status(500)
      .json({ error: 'SERVICE ROLE KEY が設定されていないためパスワードをリセットできません。' });
  }

  const { userId } = req.params;
  const { newPassword } = req.body ?? {};
  const normalizedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDを指定してください。' });
  }

  if (!normalizedPassword || normalizedPassword.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上で入力してください。' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: normalizedPassword,
    });

    if (error) {
      logger.error('Failed to reset user password', { error: error.message, userId });
      return res.status(500).json({ error: error.message });
    }

    if (!data?.user) {
      return res.status(500).json({ error: 'パスワードのリセットに失敗しました。' });
    }

    res.status(200).json({
      message: 'パスワードをリセットしました。',
      userId: data.user.id,
      email: data.user.email,
    });
  } catch (err) {
    logger.error('Unexpected error resetting password', { error: err.message, userId });
    res.status(500).json({ error: 'パスワードのリセットに失敗しました。' });
  }
});

module.exports = router;
