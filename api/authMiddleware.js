const { supabase, createSupabaseClientForToken, supabaseAdmin } = require('./supabaseClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key'; // 環境変数から取得、またはデフォルト値

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
      console.error('[auth] Failed to verify Supabase session:', error ?? 'user not found');
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
    console.error('[auth] Unexpected error during auth verification:', err);
    return res.status(500).json({ error: '認証処理中にエラーが発生しました。' });
  }
};

/**
 * Express middleware that verifies Team JWT access tokens.
 * Attaches the authenticated team to `req.team` when successful.
 */
const requireTeamAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'チーム認証が必要です。' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'チーム認証トークンが無効です。' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const teamId = decoded.teamId;

    if (!teamId) {
      return res.status(401).json({ error: 'チーム認証トークンにチームIDが含まれていません。' });
    }

    const { data: team, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (error || !team) {
      console.error('[teamAuth] Failed to fetch team for token:', error ?? 'team not found');
      return res.status(401).json({ error: 'チーム認証に失敗しました。' });
    }

    req.team = team;
    req.teamId = teamId;
    return next();
  } catch (err) {
    console.error('[teamAuth] Unexpected error during team auth verification:', err);
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: '無効なチーム認証トークンです。' });
    }
    return res.status(500).json({ error: 'チーム認証処理中にエラーが発生しました。' });
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

module.exports = { requireAuth, requireAdmin, requireRole, requireTeamAuth };
