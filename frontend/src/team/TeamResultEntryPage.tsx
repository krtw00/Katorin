import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Stack, Typography, TextField, Button, Alert, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import ResultEntryGuard, { postTeamMatchResult } from './ResultEntryGuard';

const TeamResultEntryPage: React.FC = () => {
  const { t } = useTranslation();
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
        {t('teamResultEntry.title')}
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Typography variant="body2">{t('teamResultEntry.loading')}</Typography>
      ) : match ? (
        <ResultEntryGuard
          matchId={matchId as string}
          teamId={teamId}
          fallback={<Alert severity="info">{t('teamResultEntry.viewOnly')}</Alert>}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              {match.result_status === 'finalized' ? (
                <Chip size="small" color="success" label={t('teamResultEntry.finalized')} />
              ) : (
                <Chip size="small" label={t('teamResultEntry.draft')} />
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('teamResultEntry.selfScore')}
                value={selfScore}
                onChange={(e) => setSelfScore(e.target.value)}
                inputProps={{ inputMode: 'numeric' }}
              />
              <TextField
                label={t('teamResultEntry.opponentScore')}
                value={opponentScore}
                onChange={(e) => setOpponentScore(e.target.value)}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate('/matches')}>{t('teamResultEntry.backToList')}</Button>
              <Box sx={{ flex: 1 }} />
              <Button disabled={saving} onClick={() => handleAction('cancel')}>{t('teamResultEntry.cancel')}</Button>
              <Button disabled={saving} variant="contained" onClick={() => handleAction('save')}>{t('teamResultEntry.save')}</Button>
              <Button disabled={saving} variant="contained" color="success" onClick={() => handleAction('finalize')}>{t('teamResultEntry.finalize')}</Button>
            </Stack>
          </Stack>
        </ResultEntryGuard>
      ) : null}
    </Box>
  );
};

export default TeamResultEntryPage;


