import React, { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

type Props = {
  matchId: string;
  teamId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode; // 参照専用UIなど
};

/**
 * 試合ごとの入力許可（matches.input_allowed_team_id）に基づき、
 * チーム側で結果入力を許可するためのガードコンポーネント。
 */
const ResultEntryGuard: React.FC<Props> = ({ matchId, teamId, children, fallback }) => {
  const authFetch = useAuthorizedFetch();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/matches/${matchId}`);
        if (!res.ok) {
          const msg = (await res.text()) || 'failed';
          throw new Error(msg);
        }
        const match = await res.json();
        const inputAllowed = match?.input_allowed_team_id;
        const canEdit = inputAllowed && inputAllowed !== 'admin' && inputAllowed === teamId;
        if (!cancelled) setAllowed(Boolean(canEdit));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, matchId, teamId]);

  if (loading) return <Spin size="small" />;
  if (error) return <Alert message={error} type="error" showIcon />;
  if (!allowed) return <>{fallback ?? null}</>;
  return <>{children}</>;
};

export default ResultEntryGuard;

export async function postTeamMatchResult(
  authFetch: ReturnType<typeof useAuthorizedFetch>,
  matchId: string,
  action: 'save' | 'finalize' | 'cancel',
  payload?: Record<string, unknown>
) {
  const res = await authFetch(`/api/team/matches/${matchId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const msg = (await res.text()) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}


