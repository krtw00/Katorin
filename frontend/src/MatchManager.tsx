import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';
import MatchCreateDialog from './components/MatchCreateDialog';
import { MatchRecord, DisplayMatch, CardStatus, MatchStats, formatDate, getInitial, parseScoreValue, determineStatus, statusMeta, toTimestamp } from './types/matchTypes';


type MatchManagerProps = {
  tournament: Tournament;
  onOpenResultEntry: (matchId: string) => void;
  reloadToken: number;
};

type Round = {
  id: string;
  tournament_id: string;
  number: number;
  title?: string | null;
  status: 'open' | 'closed';
  created_at: string;
  closed_at?: string | null;
};

const MatchManager: React.FC<MatchManagerProps> = ({ tournament, onOpenResultEntry, reloadToken }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'matches' | 'participants'>('matches');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [matchDialog, setMatchDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; match: MatchRecord | null }>(
    { open: false, mode: 'create', match: null },
  );
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = useState<boolean>(true);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundDialogOpen, setRoundDialogOpen] = useState<boolean>(false);
  const [roundDialogError, setRoundDialogError] = useState<string | null>(null);
  const [roundTitle, setRoundTitle] = useState<string>('');
  const [roundSubmitting, setRoundSubmitting] = useState<boolean>(false);
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const authFetch = useAuthorizedFetch();

  const loadRounds = useCallback(async () => {
    setRoundsLoading(true);
    setRoundError(null);
    try {
      const response = await authFetch(`/api/tournaments/${tournament.id}/rounds`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      const data: Round[] = await response.json();
      setRounds(data);
      setSelectedRoundId((prev) => {
        if (prev && data.some((round) => round.id === prev)) {
          return prev;
        }
        const openRound = [...data].reverse().find((round) => round.status !== 'closed');
        const fallback = data.length > 0 ? data[data.length - 1] : null;
        return (openRound ?? fallback)?.id ?? null;
      });
    } catch (err) {
      console.error('Failed to load rounds:', err);
      setRoundError(t('matchManager.fetchRoundsFailed'));
    } finally {
      setRoundsLoading(false);
    }
  }, [authFetch, tournament.id, t]);

  const loadMatches = useCallback(async () => {
    if (!selectedRoundId) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournamentId', tournament.id);
      if (selectedRoundId) {
        params.set('roundId', selectedRoundId);
      }
      const response = await authFetch(`/api/matches?${params.toString()}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(
          bodyText ? `HTTP ${response.status}: ${bodyText.slice(0, 200)}` : `HTTP ${response.status}`,
        );
      }
      if (!contentType.includes('application/json')) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(
          bodyText
            ? `unexpected response format: ${bodyText.slice(0, 200)}`
            : 'unexpected response format',
        );
      }
      const data: MatchRecord[] = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(t('matchManager.fetchMatchesFailed'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedRoundId, tournament.id, t]);

  useEffect(() => {
    setSelectedRoundId(null);
    setMatches([]);
    setRoundFeedback(null);
    loadRounds();
  }, [loadRounds, tournament.id]);

  useEffect(() => {
    if (!selectedRoundId) {
      setMatches([]);
      return;
    }
    loadMatches();
  }, [loadMatches, reloadToken, selectedRoundId]);

  const displayMatches = useMemo<DisplayMatch[]>(() => {
    const normalizeName = (value?: string | null) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : t('matchManager.teamNotSet');
    };

    return matches
      .map<DisplayMatch>((match) => {
        const homeTeam = normalizeName(match.team);
        const awayTeam = normalizeName(match.opponentTeam);
        let homeScore = parseScoreValue(match.selfScore);
        let awayScore = parseScoreValue(match.opponentScore);
        let status: CardStatus = determineStatus(homeScore, awayScore);

        try {
          if (match.player) {
            const parsed = JSON.parse(match.player);
            const accumulate = (rounds: any[]) => {
              let derivedHome = 0;
              let derivedAway = 0;
              let pendingRounds = 0;
              rounds.forEach((row: any) => {
                const rowHome = parseScoreValue(row.homeScore);
                const rowAway = parseScoreValue(row.awayScore);
                if (rowHome === null || rowAway === null) {
                  pendingRounds += 1;
                  return;
                }
                derivedHome += rowHome;
                derivedAway += rowAway;
              });
              return { derivedHome, derivedAway, pendingRounds };
            };

            if (Array.isArray(parsed) && parsed.length > 0) {
              const { derivedHome, derivedAway, pendingRounds } = accumulate(parsed);
              if (pendingRounds === 0) {
                homeScore = derivedHome;
                awayScore = derivedAway;
                status = determineStatus(homeScore, awayScore);
              } else {
                homeScore = null;
                awayScore = null;
                status = 'pending';
              }
            } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rounds)) {
              const { derivedHome, derivedAway, pendingRounds } = accumulate(parsed.rounds);
              const isFinalized = Boolean(parsed.finalized);
              if (isFinalized && pendingRounds === 0) {
                homeScore = derivedHome;
                awayScore = derivedAway;
                status = determineStatus(homeScore, awayScore);
              } else {
                homeScore = null;
                awayScore = null;
                status = 'pending';
              }
            }
          }
        } catch {
          // ignore parsing errors and fall back to raw values
        }

        const timestamp = Math.max(toTimestamp(match.date), toTimestamp(match.created_at));

        return {
          id: match.id,
          homeTeam,
          awayTeam,
          date: match.date ?? null,
          timestamp,
          homeScore,
          awayScore,
          status,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [matches, t]);

  const stats = useMemo<MatchStats>(() => {
    const teams = new Set<string>();
    let completed = 0;
    let pending = 0;

    displayMatches.forEach((match) => {
      teams.add(match.homeTeam);
      teams.add(match.awayTeam);
      if (match.status === 'pending') {
        pending += 1;
      } else {
        completed += 1;
      }
    });

    return {
      total: displayMatches.length,
      completed,
      pending,
      teamCount: teams.size,
    };
  }, [displayMatches]);

  const selectedRound = useMemo(
    () => rounds.find((round) => round.id === selectedRoundId) ?? null,
    [rounds, selectedRoundId],
  );

  const canCreateMatch = Boolean(selectedRound && selectedRound.status !== 'closed');

  const roundStatusChip = useMemo(() => {
    if (!selectedRound) return null;
    if (selectedRound.status === 'closed') {
      return <Chip label={t('matchManager.closed')} sx={{ bgcolor: '#e8ecf8', color: '#43506c', fontWeight: 700 }} />;
    }
    return <Chip label={t('matchManager.inProgress')} sx={{ bgcolor: '#e6f7ef', color: '#1f8a5d', fontWeight: 700 }} />;
  }, [selectedRound, t]);

  const latestRoundNumber = useMemo(
    () => rounds.reduce((max, round) => Math.max(max, round.number), 0),
    [rounds],
  );

  const canReopenRound = Boolean(
    selectedRound &&
      selectedRound.status === 'closed' &&
      selectedRound.number === latestRoundNumber &&
      !roundSubmitting,
  );

  const handleMatchDialogCompleted = (mode: 'create' | 'edit') => {
    setMatchDialog({ open: false, mode: 'create', match: null });
    setRoundFeedback(mode === 'create' ? t('matchManager.matchAdded') : t('matchManager.matchUpdated'));
    loadMatches();
  };

  const handleMatchDialogClosed = () => {
    setMatchDialog({ open: false, mode: 'create', match: null });
  };

  useEffect(() => {
    setRoundFeedback(null);
  }, [selectedRoundId]);

  const handleOpenCreateMatch = () => {
    if (!canCreateMatch) {
      return;
    }
    setMatchDialog({ open: true, mode: 'create', match: null });
  };

  const handleOpenEditMatch = (match: MatchRecord) => {
    setMatchDialog({ open: true, mode: 'edit', match });
  };

  const handleConfirmDeleteMatch = (match: MatchRecord) => {
    setDeleteTarget(match);
    setDeleteError(null);
  };

  const handleDeleteMatch = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const response = await authFetch(`/api/matches/${deleteTarget.id}`, { method: 'DELETE' });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      await loadMatches();
      setRoundFeedback(t('matchManager.matchDeleted'));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete match:', err);
      setDeleteError(err instanceof Error ? err.message : t('matchManager.deleteMatchFailed'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedRound) {
      window.localStorage.setItem('katorin:selectedRoundId', selectedRound.id);
      window.localStorage.setItem('katorin:selectedRoundNumber', String(selectedRound.number));
      window.dispatchEvent(new CustomEvent('katorin:roundChanged', { detail: selectedRound }));
    } else {
      window.localStorage.removeItem('katorin:selectedRoundId');
      window.localStorage.removeItem('katorin:selectedRoundNumber');
      window.dispatchEvent(new CustomEvent('katorin:roundCleared'));
    }
  }, [selectedRound]);

  const handleCreateRound = async () => {
    if (roundSubmitting) return;
    setRoundSubmitting(true);
    setRoundDialogError(null);
    try {
      const response = await authFetch(`/api/tournaments/${tournament.id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: roundTitle.trim().length > 0 ? roundTitle.trim() : undefined,
        }),
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      const newRound: Round = await response.json();
      await loadRounds();
      setSelectedRoundId(newRound.id);
      setRoundFeedback(t('matchManager.roundCreated', { number: newRound.number }));
      setRoundDialogOpen(false);
      setRoundTitle('');
      setRoundDialogError(null);
    } catch (err) {
      console.error('Failed to create round:', err);
      setRoundDialogError(t('matchManager.createRoundFailed'));
    } finally {
      setRoundSubmitting(false);
    }
  };

  const handleCloseRound = async () => {
    if (!selectedRound || selectedRound.status === 'closed') {
      return;
    }
    const closingRound = selectedRound;
    setRoundSubmitting(true);
    setRoundFeedback(null);
    try {
      const response = await authFetch(
        `/api/tournaments/${tournament.id}/rounds/${closingRound.id}/close`,
        { method: 'POST' },
      );
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      await loadRounds();
      setRoundFeedback(t('matchManager.roundClosed', { number: closingRound.number }));
    } catch (err) {
      console.error('Failed to close round:', err);
      setRoundFeedback(t('matchManager.closeRoundFailed'));
    } finally {
      setRoundSubmitting(false);
    }
  };

  const handleReopenRound = async () => {
    if (!selectedRound || selectedRound.status !== 'closed') {
      return;
    }
    const reopeningRound = selectedRound;
    setRoundSubmitting(true);
    setRoundFeedback(null);
    try {
      const response = await authFetch(
        `/api/tournaments/${tournament.id}/rounds/${reopeningRound.id}/reopen`,
        { method: 'POST' },
      );
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      await loadRounds();
      setRoundFeedback(t('matchManager.roundReopened', { number: reopeningRound.number }));
    } catch (err) {
      console.error('Failed to reopen round:', err);
      setRoundFeedback(t('matchManager.reopenRoundFailed'));
    } finally {
      setRoundSubmitting(false);
    }
  };
  const renderStatsChips = () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Chip
        label={t('matchManager.totalMatches', { count: stats.total })}
        sx={{ bgcolor: '#0d1026', color: '#fff', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
      <Chip
        label={t('matchManager.completed', { count: stats.completed })}
        sx={{ bgcolor: '#e6f7ef', color: '#1f8a5d', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
      <Chip
        label={t('matchManager.pending', { count: stats.pending })}
        sx={{ bgcolor: '#fff4e6', color: '#b66d1f', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
      <Chip
        label={t('matchManager.registeredTeams', { count: stats.teamCount })}
        sx={{ bgcolor: '#f4f6fd', color: '#4a5162', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
    </Stack>
  );

  const renderRoundControls = () => (
    <Stack spacing={2}>
      {roundFeedback ? (
        <Alert severity="success" onClose={() => setRoundFeedback(null)}>
          {roundFeedback}
        </Alert>
      ) : null}
      {roundError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" startIcon={<RefreshRoundedIcon />} onClick={loadRounds}>
              {t('matchManager.reload')}
            </Button>
          }
        >
          {roundError}
        </Alert>
      ) : null}
      {roundsLoading ? (
        <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            {t('matchManager.loadingRounds')}
          </Typography>
        </Stack>
      ) : rounds.length === 0 ? (
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            bgcolor: '#fff',
            border: '1px dashed rgba(24, 32, 56, 0.18)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700, color: '#2f3645', mb: 1.5 }}>{t('matchManager.noRoundsYet')}</Typography>
          <Typography sx={{ fontSize: 13, color: '#7e8494', mb: 3 }}>
            {t('matchManager.createFirstRoundPrompt')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setRoundTitle('');
              setRoundDialogError(null);
              setRoundDialogOpen(true);
            }}
            sx={{
              bgcolor: '#0d1026',
              borderRadius: 999,
              px: 3,
              py: 1.15,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#181d3f' },
            }}
          >
            {t('matchManager.createFirstRound')}
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <ToggleButtonGroup
              exclusive
              value={selectedRoundId}
              onChange={(_, newRoundId) => {
                if (newRoundId) {
                  setSelectedRoundId(newRoundId);
                }
              }}
              sx={{
                flexWrap: 'wrap',
                gap: 1,
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  minWidth: 140,
                  borderRadius: 12,
                  border: '1px solid rgba(24, 32, 56, 0.12)',
                  color: '#4a5162',
                  px: 2,
                  py: 1.25,
                },
                '& .Mui-selected': {
                  bgcolor: '#f4f7ff',
                  borderColor: '#0d1026',
                  color: '#0d1026',
                  boxShadow: '0 6px 18px rgba(34, 53, 102, 0.12)',
                },
              }}
            >
              {rounds.map((round) => (
                <ToggleButton key={round.id} value={round.id}>
                  <Stack spacing={0.5} alignItems="center">
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t('matchManager.roundNumber', { number: round.number })}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#7d8495' }}>
                      {round.status === 'closed' ? t('matchManager.closed') : t('matchManager.inProgress')}
                    </Typography>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  setRoundTitle('');
                  setRoundDialogError(null);
                  setRoundDialogOpen(true);
                }}
                disabled={roundSubmitting}
              >
                {t('matchManager.createNewRound')}
              </Button>
              {selectedRound && selectedRound.status === 'closed' ? (
                <Button
                  variant="contained"
                  startIcon={<ReplayRoundedIcon />}
                  onClick={handleReopenRound}
                  disabled={!canReopenRound}
                >
                  {t('matchManager.reopenThisRound')}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleCloseRound}
                  disabled={!selectedRound || roundSubmitting}
                >
                  {t('matchManager.closeThisRound')}
                </Button>
              )}
            </Stack>
          </Stack>
          {selectedRound ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700, color: '#2f3645' }}>
                {t('matchManager.roundNumber', { number: selectedRound.number })}
                {selectedRound.title ? `｜${selectedRound.title}` : ''}
              </Typography>
              {roundStatusChip}
            </Stack>
          ) : null}
          {selectedRound && selectedRound.status === 'closed' ? (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              {canReopenRound
                ? t('matchManager.roundClosedCanReopen')
                : t('matchManager.roundClosedCannotReopen')}
            </Alert>
          ) : null}
        </Stack>
      )}
    </Stack>
  );

  const renderMatchCard = (match: DisplayMatch) => {
    const homeInitial = getInitial(match.homeTeam);
    const awayInitial = getInitial(match.awayTeam);
    const homeScoreDisplay = match.status === 'pending' ? '-' : match.homeScore;
    const awayScoreDisplay = match.status === 'pending' ? '-' : match.awayScore;
    const info = statusMeta[match.status](match);

    const isHomeWinner = match.status === 'homeWin';
    const isAwayWinner = match.status === 'awayWin';
    const isPending = match.status === 'pending';
    const isDraw = match.status === 'draw';

    const renderTeamColumn = (teamName: string, initial: string, highlight: boolean) => (
      <Stack spacing={1} alignItems="center" sx={{ flex: 1 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            fontWeight: 700,
            fontSize: 16,
            bgcolor: highlight ? '#0d1026' : '#f4f6fd',
            color: highlight ? '#fff' : '#4a5162',
          }}
        >
          {initial}
        </Avatar>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 700,
            color: highlight ? '#0d1026' : '#4a5162',
            textAlign: 'center',
          }}
        >
          {teamName}
        </Typography>
        {highlight && match.status !== 'pending' && match.status !== 'draw' && (
          <Chip
            label="WIN"
            size="small"
            sx={{
              bgcolor: '#0d1026',
              color: '#fff',
              fontWeight: 700,
              height: 22,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
        {isDraw && (
          <Chip
            label="DRAW"
            size="small"
            sx={{
              bgcolor: '#e8ecf8',
              color: '#43506c',
              fontWeight: 700,
              height: 22,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
        {isPending && (
          <Chip
            label={t('matchManager.awaitingResult')}
            size="small"
            sx={{
              bgcolor: '#f6f7fb',
              color: '#7e8494',
              fontWeight: 600,
              height: 22,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
      </Stack>
    );

    return (
      <Paper
        key={match.id}
        sx={{
          borderRadius: 4,
          p: { xs: 2.5, md: 3 },
          bgcolor: '#fff',
          boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
          border: '1px solid rgba(24, 32, 56, 0.08)',
        }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#7e8494' }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: 13 }}>{formatDate(match.date)}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={info.label}
                size="small"
                sx={{
                  bgcolor: info.bgcolor,
                  color: info.color,
                  fontWeight: 700,
                  height: 24,
                  '& .MuiChip-label': { px: 1.75 },
                }}
              />
              <Tooltip title={t('matchManager.editMatch')} arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenEditMatch(match)}
                    disabled={!canCreateMatch}
                    sx={{ color: '#4a5162' }}
                  >
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('matchManager.deleteMatch')} arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleConfirmDeleteMatch(match)}
                    disabled={!canCreateMatch}
                    sx={{ color: '#b42318' }}
                  >
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: { xs: 2, md: 3 },
            }}
          >
            {renderTeamColumn(match.homeTeam, homeInitial, isHomeWinner)}
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 96 }}>
              <Typography sx={{ fontSize: 12, color: '#7e8494', letterSpacing: '0.12em' }}>SCORE</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#1a1d2f' }}>
                {homeScoreDisplay}
                <Typography component="span" sx={{ mx: 1, fontSize: 22, color: '#7e8494' }}>
                  -
                </Typography>
                {awayScoreDisplay}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#9ba0ad', letterSpacing: '0.16em' }}>VS</Typography>
            </Stack>
            {renderTeamColumn(match.awayTeam, awayInitial, isAwayWinner)}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => onOpenResultEntry(match.id)}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                borderColor: 'rgba(24,32,56,0.18)',
                color: '#2f3645',
                '&:hover': { borderColor: '#181d3f', bgcolor: 'rgba(24,32,56,0.05)' },
              }}
            >
              {t('matchManager.toResultEntry')}
            </Button>
          </Box>
        </Stack>
      </Paper>
    );
  };

  const renderMatchList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="inherit" />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" startIcon={<RefreshRoundedIcon />} onClick={loadMatches}>
              {t('matchManager.reload')}
            </Button>
          }
          sx={{ borderRadius: 3 }}
        >
          {error}
        </Alert>
      );
    }

    if (displayMatches.length === 0) {
      return (
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            bgcolor: '#fff',
            border: '1px dashed rgba(24, 32, 56, 0.16)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700, color: '#2f3645', mb: 1.5 }}>{t('matchManager.noMatchesYet')}</Typography>
          <Typography sx={{ fontSize: 13, color: '#7e8494', mb: 3 }}>
            {t('matchManager.createMatchPrompt')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenCreateMatch}
            disabled={!canCreateMatch}
            sx={{
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              bgcolor: canCreateMatch ? '#0d1026' : '#9ca3af',
              '&:hover': { bgcolor: canCreateMatch ? '#181d3f' : '#9ca3af' },
            }}
          >
            {t('matchManager.createMatch')}
          </Button>
        </Paper>
      );
    }

    return (
      <Stack spacing={3}>
        {displayMatches.map(renderMatchCard)}
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f6f7fb',
        py: 6,
        px: { xs: 3, md: 8 },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          maxWidth: 1120,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <Paper
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 3, md: 4 },
            px: { xs: 3, md: 4 },
            py: { xs: 3, md: 3.5 },
            borderRadius: 4,
            boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
            border: '1px solid rgba(24, 32, 56, 0.06)',
            bgcolor: '#fff',
          }}
        >
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 420 }}>
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#ff8c3d', letterSpacing: 1 }}>
                {t('matchManager.title')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#6d7385', fontWeight: 600 }}>
                {t('matchManager.description')}
              </Typography>
            </Stack>
            <ToggleButtonGroup
              exclusive
              value={view}
              onChange={(_, newView) => {
                if (newView) setView(newView);
              }}
              sx={{
                bgcolor: '#f6f7fb',
                borderRadius: 999,
                p: 0.5,
                width: '100%',
                boxShadow: 'inset 0 0 0 1px rgba(24, 32, 56, 0.08)',
                '& .MuiToggleButton-root': {
                  flex: 1,
                  border: 'none',
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#6a7184',
                },
                '& .Mui-selected': {
                  bgcolor: '#f4f7ff',
                  color: '#1a1d2f',
                  boxShadow: '0 6px 18px rgba(34, 53, 102, 0.12)',
                },
                '& .MuiToggleButton-root:hover': {
                  bgcolor: 'rgba(30, 47, 103, 0.05)',
                },
              }}
            >
              <ToggleButton value="matches">{t('matchManager.matchList')}</ToggleButton>
              <ToggleButton value="participants">{t('matchManager.participantManagement')}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Paper>
        <Box>
          <Stack spacing={3} sx={{ mb: 3 }}>
            {renderRoundControls()}
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Stack spacing={0.5}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#293049' }}>{t('matchManager.matchCardList')}</Typography>
                <Typography sx={{ fontSize: 13, color: '#7e8494' }}>
                  {t('matchManager.matchCardListDescription')}
                </Typography>
              </Stack>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenCreateMatch}
                disabled={!canCreateMatch}
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'auto' },
                  bgcolor: canCreateMatch ? '#0d1026' : '#9ca3af',
                  px: 3,
                  py: 1.25,
                  borderRadius: 999,
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: canCreateMatch ? '#181d3f' : '#9ca3af' },
                }}
              >
                {t('matchManager.createMatch')}
              </Button>
            </Box>
            {renderStatsChips()}
          </Stack>
          {view === 'matches' ? (
            renderMatchList()
          ) : (
            <Paper
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: '#fff',
                border: '1px dashed rgba(24, 32, 56, 0.16)',
              }}
            >
              <Typography sx={{ fontWeight: 700, color: '#2f3645', mb: 1.5 }}>{t('matchManager.participantManagementComingSoon')}</Typography>
              <Typography sx={{ fontSize: 13, color: '#7e8494' }}>
                {t('matchManager.participantManagementDescription')}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
      <MatchCreateDialog
        open={matchDialog.open}
        mode={matchDialog.mode}
        match={matchDialog.match}
        onClose={handleMatchDialogClosed}
        onCompleted={handleMatchDialogCompleted}
        tournamentId={tournament.id}
        roundId={selectedRound?.id ?? null}
      />
      <Dialog open={roundDialogOpen} onClose={() => (!roundSubmitting ? setRoundDialogOpen(false) : null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('matchManager.createRound')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {roundDialogError ? <Alert severity="error">{roundDialogError}</Alert> : null}
            <Typography variant="body2" color="text.secondary">
              {t('matchManager.roundNameOptional')}
            </Typography>
            <TextField
              label={t('matchManager.roundNameLabel')}
              placeholder={t('matchManager.roundNamePlaceholder')}
              value={roundTitle}
              onChange={(event) => setRoundTitle(event.target.value)}
              fullWidth
              disabled={roundSubmitting}
            />
          </Stack>
        </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setRoundDialogOpen(false);
            setRoundDialogError(null);
          }}
            disabled={roundSubmitting}
          >
            {t('matchManager.cancel')}
          </Button>
          <Button onClick={handleCreateRound} variant="contained" disabled={roundSubmitting}>
            {roundSubmitting ? t('matchManager.creating') : t('matchManager.create')}
          </Button>
      </DialogActions>
    </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('matchManager.deleteMatchTitle')}</DialogTitle>
        <DialogContent dividers>
          {deleteError ? <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert> : null}
          <DialogContentText sx={{ color: '#4a5162' }}>
            {t('matchManager.deleteMatchConfirmation')}
          </DialogContentText>
          {deleteTarget ? (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafc', borderRadius: 2 }}>
              <Typography fontWeight={700} sx={{ color: '#1f2937' }}>
                {deleteTarget.team ?? t('matchManager.teamNotSet')} vs {deleteTarget.opponentTeam ?? t('matchManager.teamNotSet')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(deleteTarget.date)}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteSubmitting}>
            {t('matchManager.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteMatch}
            disabled={deleteSubmitting}
          >
            {deleteSubmitting ? t('matchManager.deleting') : t('matchManager.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};



export default MatchManager;
