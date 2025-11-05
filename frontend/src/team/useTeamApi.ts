import { useCallback } from 'react';

type FetchArgs = Parameters<typeof fetch>;

/**
 * チームJWTを Authorization ヘッダーに付与して API を呼び出すためのヘルパー。
 */
export const useTeamApi = () => {
  return useCallback(
    (input: FetchArgs[0], init?: FetchArgs[1]) => {
      const headers = new Headers(init?.headers ?? undefined);
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = window.localStorage.getItem('team_jwt_token');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, {
        ...init,
        headers,
      });
    },
    [],
  );
};

export const getTeamToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('team_jwt_token');
};
