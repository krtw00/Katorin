import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

/**
 * 管理画面へのアクセス権限をチェックするフック
 *
 * 以下のユーザーが管理画面にアクセス可能：
 * - role が 'admin' のユーザー
 * - role が 'team' かつ has_admin_access=true のチーム
 */
export const useAdminAccess = () => {
  const { user } = useAuth();
  const authFetch = useAuthorizedFetch();
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAccess = useCallback(async () => {
    if (!user) {
      setCanAccessAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // 管理者チェック
      const role = user.app_metadata?.role;
      const roles = user.app_metadata?.roles;
      const normalizedRoles = [
        ...(Array.isArray(roles) ? roles : roles ? [roles] : []),
        role,
      ]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase());

      if (normalizedRoles.includes('admin')) {
        setCanAccessAdmin(true);
        setLoading(false);
        return;
      }

      // チームユーザーの場合、has_admin_accessをチェック
      if (normalizedRoles.includes('team')) {
        const res = await authFetch('/api/team/me');
        if (res.ok) {
          const team = await res.json();
          setCanAccessAdmin(Boolean(team.has_admin_access));
        } else {
          setCanAccessAdmin(false);
        }
      } else {
        setCanAccessAdmin(false);
      }
    } catch (e) {
      console.error('Failed to check admin access', e);
      setCanAccessAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { canAccessAdmin, loading, refetch: checkAccess };
};
