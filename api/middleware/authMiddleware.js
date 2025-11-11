const { supabase, createSupabaseClientForToken, supabaseAdmin } = require('../config/supabaseClient');
const { logger } = require('../config/logger');

/**
 * Express middleware that verifies Supabase JWT access tokens.
 * Attaches the authenticated user to `req.user` when successful.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: '認証が必要です。' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: '認証トークンが無効です。' });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      logger.error('Failed to verify Supabase session', { error: error?.message, context: 'auth' });
      return res.status(401).json({ error: '認証に失敗しました。' });
    }

    req.user = data.user;
    req.authToken = token;

    const bypassRls = process.env.SUPABASE_BYPASS_RLS === 'true';

    if (bypassRls && supabaseAdmin) {
      req.supabase = supabaseAdmin;
    } else if (createSupabaseClientForToken) {
      req.supabase = createSupabaseClientForToken(token);
    } else if (supabaseAdmin) {
      req.supabase = supabaseAdmin;
    } else {
      req.supabase = supabase;
    }
    return next();
  } catch (err) {
    logger.error('Unexpected error during auth verification', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: '認証処理中にエラーが発生しました。' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です。' });
  }
  const roles = []
    .concat(req.user.app_metadata?.role ?? [])
    .concat(req.user.app_metadata?.roles ?? []);
  const normalizedRoles = roles
    .flat()
    .filter(Boolean)
    .map((value) => value.toString().toLowerCase());
  if (!normalizedRoles.includes(role.toLowerCase())) {
    return res.status(403).json({ error: 'この操作を行う権限がありません。' });
  }
  return next();
};

const requireAdmin = requireRole('admin');

/**
 * ミドルウェア: 管理者 または has_admin_access=true のチームユーザーのみ許可
 * 運営補助作業を行うチームユーザーに管理画面へのアクセスを許可する
 */
const requireAdminOrEditor = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です。' });
  }

  try {
    // 管理者チェック
    const roles = []
      .concat(req.user.app_metadata?.role ?? [])
      .concat(req.user.app_metadata?.roles ?? []);
    const normalizedRoles = roles
      .flat()
      .filter(Boolean)
      .map((value) => value.toString().toLowerCase());

    if (normalizedRoles.includes('admin')) {
      return next(); // 管理者は通過
    }

    // チームユーザーの場合、has_admin_accessをチェック
    if (normalizedRoles.includes('team')) {
      const client = req.supabase ?? supabaseAdmin ?? supabase;
      if (!client) {
        logger.error('No Supabase client available for requireAdminOrEditor');
        return res.status(500).json({ error: '権限チェックに失敗しました。' });
      }

      const { data: team, error: teamError } = await client
        .from('teams')
        .select('id, has_admin_access')
        .eq('auth_user_id', req.user.id)
        .single();

      if (teamError || !team) {
        logger.warn('Team not found for admin access check', {
          userId: req.user.id,
          error: teamError?.message,
        });
        return res.status(403).json({ error: '運営権限がありません。' });
      }

      if (team.has_admin_access === true) {
        req.team = team; // 後続の処理で使用
        return next();
      }

      return res.status(403).json({ error: '運営権限がありません。' });
    }

    return res.status(403).json({ error: '権限がありません。' });
  } catch (err) {
    logger.error('Error checking admin/editor permission', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: '権限チェック中にエラーが発生しました。' });
  }
};

/**
 * ミドルウェア: 認証済みユーザーに紐づくチームを取得してreq.teamに設定
 * requireAuthの後に使用する
 */
const attachTeam = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です。' });
  }

  try {
    const client = req.supabase ?? supabaseAdmin ?? supabase;
    if (!client) {
      logger.error('No Supabase client available for attachTeam');
      return res.status(500).json({ error: 'チーム情報の取得に失敗しました。' });
    }

    const { data: team, error } = await client
      .from('teams')
      .select('*')
      .eq('auth_user_id', req.user.id)
      .single();

    if (error || !team) {
      logger.error('Failed to fetch team for authenticated user', {
        userId: req.user.id,
        error: error?.message,
      });
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    req.team = team;
    req.teamId = team.id;
    return next();
  } catch (err) {
    logger.error('Unexpected error while attaching team', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'チーム情報の取得に失敗しました。' });
  }
};

module.exports = { requireAuth, requireAdmin, requireRole, requireAdminOrEditor, attachTeam };
