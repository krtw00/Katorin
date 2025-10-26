const { supabase } = require('./supabaseClient');

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
    return next();
  } catch (err) {
    console.error('[auth] Unexpected error during auth verification:', err);
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

module.exports = { requireAuth, requireAdmin, requireRole };
