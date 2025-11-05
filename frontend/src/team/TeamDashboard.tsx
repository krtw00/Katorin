import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTeamApi } from './useTeamApi';
import type { MatchRecord } from '../types/matchTypes';

type Participant = {
  id: string;
  name: string;
  can_edit: boolean;
};

type TeamUser = {
  id: string;
  name: string;
  can_edit: boolean;
};

const todaysDateKey = () => new Date().toISOString().slice(0, 10);

const parseScore = (value?: string | null): number | null => {
  if (value === null || value === undefined) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const getOutcome = (match: MatchRecord) => {
  const self = parseScore(match.selfScore);
  const opp = parseScore(match.opponentScore);
  if (self === null || opp === null) return 'pending';
  if (self > opp) return 'win';
  if (self < opp) return 'lose';
  return 'draw';
};

type Props = {
  onSignOut: () => void;
};

const TeamDashboard: React.FC<Props> = ({ onSignOut }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const teamApi = useTeamApi();
  const [teamId, setTeamId] = useState<string | undefined>(
    (typeof window !== 'undefined' && window.localStorage.getItem('team_id')) || undefined,
  );
  const [teamName, setTeamName] = useState<string | undefined>(
    (typeof window !== 'undefined' && window.localStorage.getItem('team_name')) || undefined,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (teamId) return;
    let cancelled = false;

    const loadTeam = async () => {
      setLoadError(null);
      try {
        const res = await authFetch('/api/team/me');
        if (res.status === 401) {
          return;
        }
        if (!res.ok) {
          const msg = (await res.text()) || t('teamDashboard.loadTeamFailed');
          throw new Error(msg);
        }
        const data = await res.json();
        if (!cancelled) {
          setTeamId(data.id);
          setTeamName(data.name);
          try {
            window.localStorage.setItem('team_id', data.id);
            window.localStorage.setItem('team_name', data.name);
          } catch {
            // ignore localStorage errors
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message || t('teamDashboard.loadTeamFailed'));
        }
      }
    };

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [teamId, authFetch, t, refreshCounter]);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const [userRes, matchesRes, participantsRes] = await Promise.all([
          teamApi('/api/team/current-user'),
          teamApi('/api/team/matches'),
          teamApi('/api/team/participants'),
        ]);

        if (!userRes.ok) {
          const message = (await userRes.text()) || t('teamDashboard.loadPermissionFailed');
          throw new Error(message);
        }
        if (!matchesRes.ok) {
          const message = (await matchesRes.text()) || t('teamDashboard.loadMatchesFailed');
          throw new Error(message);
        }
        if (!participantsRes.ok) {
          const message = (await participantsRes.text()) || t('teamDashboard.loadParticipantsFailed');
          throw new Error(message);
        }

        const userData = (await userRes.json()) as TeamUser;
        const matchesData = (await matchesRes.json()) as MatchRecord[];
        const participantsData = (await participantsRes.json()) as Participant[];

        if (cancelled) return;

        setCanEdit(userData.can_edit);
        setMatches(matchesData);
        setParticipants(participantsData);
      } catch (e: any) {
        if (!cancelled) {
          const message = e?.message ?? t('teamDashboard.loadDashboardFailed');
          setDashboardError(message);
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [teamId, teamApi, t, refreshCounter]);

  const todayKey = useMemo(() => todaysDateKey(), []);

  const todayMatches = useMemo(
    () =>
      matches.filter((match) => {
        if (!match?.date) return false;
        return match.date.slice(0, 10) === todayKey;
      }),
    [matches, todayKey],
  );

  const todaySummary = useMemo(() => {
    let wins = 0;
    let losses = 0;
    todayMatches.forEach((match) => {
      const outcome = getOutcome(match);
      if (outcome === 'win') wins += 1;
      if (outcome === 'lose') losses += 1;
    });
    return {
      total: todayMatches.length,
      wins,
      losses,
    };
  }, [todayMatches]);

  const handleRetry = () => {
    setLoadError(null);
    setDashboardError(null);
    setRefreshCounter((prev) => prev + 1);
  };

  const managementCardContent = () => {
    if (dashboardLoading && canEdit === null) {
      return (
        <Stack spacing={1}>
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="70%" />
          <Skeleton
            variant="rectangular"
            height={44}
            sx={{ borderRadius: 1, width: { xs: '100%', sm: 240 } }}
          />
        </Stack>
      );
    }

    const isEditor = Boolean(canEdit);
    const title = isEditor
      ? t('teamDashboard.matchManagementAdminTitle')
      : t('teamDashboard.matchManagementViewerTitle');
    const description = isEditor
      ? t('teamDashboard.matchManagementAdminDescription')
      : t('teamDashboard.matchManagementViewerDescription');
    const buttonLabel = isEditor
      ? t('teamDashboard.matchManagementAdminButton')
      : t('teamDashboard.matchManagementViewerButton');
    const buttonVariant = isEditor ? 'contained' : 'outlined';
    const buttonColor = isEditor ? 'primary' : 'inherit';
    const buttonSize = isEditor ? 'large' : 'medium';

    return (
      <Stack spacing={2}>
        <Typography variant="h5" component="h2" fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
        <Button
          variant={buttonVariant}
          color={buttonColor}
          size={buttonSize}
          component={RouterLink}
          to="/match-manager"
        >
          {buttonLabel}
        </Button>
      </Stack>
    );
  };

  const summaryCardContent = () => {
    if (dashboardLoading) {
      return (
        <Stack spacing={1}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="70%" />
        </Stack>
      );
    }

    return (
      <Stack spacing={1}>
        <Typography variant="h6" component="h3">
          {t('teamDashboard.todaySummaryTitle')}
        </Typography>
        <Typography variant="body1">
          {t('teamDashboard.todayMatchesLabel', { count: todaySummary.total })}
        </Typography>
        <Typography variant="body1">
          {todaySummary.total > 0
            ? t('teamDashboard.todayRecordValue', {
                wins: todaySummary.wins,
                losses: todaySummary.losses,
              })
            : t('teamDashboard.todayRecordEmpty')}
        </Typography>
      </Stack>
    );
  };

  const participantsCardContent = () => {
    if (dashboardLoading) {
      return (
        <Stack spacing={1}>
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton
            variant="rectangular"
            height={36}
            sx={{ borderRadius: 1, width: { xs: '100%', sm: 200 } }}
          />
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6" component="h3">
            {t('teamDashboard.membersSection')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('teamDashboard.membersDescription')}
          </Typography>
        </Stack>
        <Typography variant="body1">
          {t('teamDashboard.participantsCountLabel', { count: participants.length })}
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to={teamId ? `/team/${teamId}/participants` : '/login'}
        >
          {t('teamDashboard.manageParticipantsButton')}
        </Button>
      </Stack>
    );
  };

  const historyCardContent = () => {
    if (dashboardLoading) {
      return (
        <Stack spacing={1}>
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="75%" />
          <Skeleton
            variant="rectangular"
            height={36}
            sx={{ borderRadius: 1, width: { xs: '100%', sm: 220 } }}
          />
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6" component="h3">
            {t('teamDashboard.historySectionTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('teamDashboard.historySectionDescription')}
          </Typography>
        </Stack>
        <Button variant="outlined" component={RouterLink} to="/matches">
          {t('teamDashboard.historyButton')}
        </Button>
      </Stack>
    );
  };

  const errorMessage = loadError || dashboardError;

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={3}>
        {errorMessage ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                {t('teamDashboard.retry')}
              </Button>
            }
          >
            {errorMessage}
          </Alert>
        ) : null}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" component="h1" fontWeight="bold">
            {t('teamDashboard.title')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onSignOut}>
              {t('teamDashboard.signOut')}
            </Button>
          </Stack>
        </Stack>
        {teamName ? (
          <Typography variant="subtitle1" color="text.secondary">
            {t('teamDashboard.subtitle', { teamName })}
          </Typography>
        ) : null}
        <Paper elevation={3} sx={{ p: { xs: 3, md: 4 } }}>
          {managementCardContent()}
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} lg={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              {summaryCardContent()}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              {participantsCardContent()}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              {historyCardContent()}
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default TeamDashboard;
