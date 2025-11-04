import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography, Paper, Button, Alert } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

type Props = { onSignOut?: () => void };

const TeamDashboard: React.FC<Props> = ({ onSignOut }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const [teamId, setTeamId] = useState<string | undefined>(
    (typeof window !== 'undefined' && localStorage.getItem('team_id')) || undefined,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/team/me');
        if (res.status === 401) {
          // サインアウト直後などの401は無視
          return;
        }
        if (!res.ok) {
          const msg = (await res.text()) || 'failed';
          throw new Error(msg);
        }
        const data = await res.json();
        if (!cancelled) {
          setTeamId(data.id);
          try {
            localStorage.setItem('team_id', data.id);
            localStorage.setItem('team_name', data.name);
          } catch {}
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, authFetch]);

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={3}>
        {loadError ? <Alert severity="error">{loadError}</Alert> : null}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" component="h1" fontWeight="bold">
            {t('teamDashboard.title')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onSignOut}>
              ログアウト
            </Button>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {t('teamDashboard.membersSection')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('teamDashboard.membersDescription')}
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to={teamId ? `/team/${teamId}/participants` : '/login'}
            >
              {t('participantManagement.title')}
            </Button>
          </Paper>
          <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {t('teamDashboard.matchesSection')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('matchManager.description')}
            </Typography>
            <Button variant="outlined" component={RouterLink} to="/matches">
              {t('matchManager.matchList')}
            </Button>
          </Paper>
        </Stack>
      </Stack>
    </Box>
  );
};

export default TeamDashboard;
