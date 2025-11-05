import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Stack, Typography, TextField, Button, Alert, Chip } from '@mui/material';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import ResultEntryGuard, { postTeamMatchResult } from './ResultEntryGuard';

const TeamResultEntryPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const authFetch = useAuthorizedFetch();
  const teamId = (typeof window !== 'undefined' && localStorage.getItem('team_id')) || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<any | null>(null);
  const [selfScore, setSelfScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!matchId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/matches/${matchId}`);
        if (!res.ok) throw new Error((await res.text()) || 'failed');
        const data = await res.json();
        if (!cancelled) {
          setMatch(data);
          setSelfScore(data?.selfScore ?? '');
          setOpponentScore(data?.opponentScore ?? '');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, matchId]);

  const handleAction = async (action: 'save' | 'finalize' | 'cancel') => {
    if (!matchId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = action === 'cancel' ? undefined : { selfScore, opponentScore };
      const updated = await postTeamMatchResult(authFetch, matchId, action, payload);
      setMatch(updated);
      if (action !== 'cancel') {
        setSelfScore(updated?.selfScore ?? '');
        setOpponentScore(updated?.opponentScore ?? '');
      }
      if (action === 'finalize') {
        // 完了後は一覧に戻す
        navigate('/matches');
      }
    } catch (e: any) {
      setError(e?.message || 'failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        試合結果入力
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Typography variant="body2">読み込み中...</Typography>
      ) : match ? (
        <ResultEntryGuard
          matchId={matchId as string}
          teamId={teamId}
          fallback={<Alert severity="info">この試合は参照のみです。</Alert>}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              {match.result_status === 'finalized' ? (
                <Chip size="small" color="success" label="確定済" />
              ) : (
                <Chip size="small" label="未確定" />
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="自チームスコア"
                value={selfScore}
                onChange={(e) => setSelfScore(e.target.value)}
                inputProps={{ inputMode: 'numeric' }}
              />
              <TextField
                label="相手チームスコア"
                value={opponentScore}
                onChange={(e) => setOpponentScore(e.target.value)}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate('/matches')}>一覧へ戻る</Button>
              <Box sx={{ flex: 1 }} />
              <Button disabled={saving} onClick={() => handleAction('cancel')}>取消</Button>
              <Button disabled={saving} variant="contained" onClick={() => handleAction('save')}>保存</Button>
              <Button disabled={saving} variant="contained" color="success" onClick={() => handleAction('finalize')}>確定</Button>
            </Stack>
          </Stack>
        </ResultEntryGuard>
      ) : null}
    </Box>
  );
};

export default TeamResultEntryPage;


