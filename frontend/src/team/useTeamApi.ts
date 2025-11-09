import { useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';

type FetchArgs = Parameters<typeof fetch>;

/**
 * チーム用の API を呼び出すためのヘルパー。
 * Supabase Auth トークン（セッションアクセストークン）を Authorization ヘッダーに付与します。
 *
 * ⚠️ NOTE: 従来の team_jwt_token の使用は廃止されました。
 * Supabase Auth のセッショントークンを使用してください。
 */
export const useTeamApi = () => {
  const { getAccessToken } = useAuth();

  return useCallback(
    (input: FetchArgs[0], init?: FetchArgs[1]) => {
      const headers = new Headers(init?.headers ?? undefined);
      const token = getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, {
        ...init,
        headers,
      });
    },
    [getAccessToken],
  );
};

/**
 * ⚠️ DEPRECATED: getTeamToken is no longer used.
 * Use useAuth().getAccessToken() instead.
 */
export const getTeamToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Fallback to old localStorage token if it exists (for backward compatibility)
  return window.localStorage.getItem('team_jwt_token');
};
