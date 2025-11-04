import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, Stack, Button, Chip, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

const MatchList: React.FC = () => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const teamId = (typeof window !== 'undefined' && localStorage.getItem('team_id')) || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/team/matches');
        if (!res.ok) throw new Error((await res.text()) || 'failed');
        const data = await res.json();
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
        {t('matchManager.matchList')}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Alert severity="info" sx={{ mb: 2 }}>{t('matchManager.matchCardListDescription')}</Alert>
      <Stack spacing={2}>
        {records.map((m) => {
          const canInput = m?.input_allowed_team_id && m.input_allowed_team_id !== 'admin' && m.input_allowed_team_id === teamId;
          const finalized = m?.result_status === 'finalized';
          return (
            <Paper key={m.id} sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">{m.team ?? '—'} vs {m.opponentTeam ?? '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">{m.date ?? t('teamDashboard.noDate')}</Typography>
                  <Stack direction="row" spacing={1}>
                    {finalized ? <Chip size="small" color="success" label={t('common.finalized') || '確定'} /> : <Chip size="small" label={t('common.draft') || '未確定'} />}
                    {m.selfScore || m.opponentScore ? (
                      <Chip size="small" label={`${t('teamDashboard.matchScore', { self: m.selfScore ?? '-', opponent: m.opponentScore ?? '-' })}`} />
                    ) : (
                      <Chip size="small" label={t('teamDashboard.noMatches') || '未入力'} />
                    )}
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    component={RouterLink}
                    to={canInput ? `/team/matches/${m.id}/entry` : '#'}
                    disabled={!canInput || finalized}
                  >
                    {t('common.inputResult') || '結果入力'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

export default MatchList;


