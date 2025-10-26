import { useCallback } from 'react';
import { useAuth } from './AuthContext';

type FetchArgs = Parameters<typeof fetch>;

export const useAuthorizedFetch = () => {
  const { getAccessToken } = useAuth();

  return useCallback(
    (input: FetchArgs[0], init?: FetchArgs[1]) => {
      const token = getAccessToken();
      const headers = new Headers(init?.headers ?? undefined);
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
