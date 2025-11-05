import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { useTranslation } from 'react-i18next';
import { useTeamApi } from '../team/useTeamApi';
import MatchEditDialog from './MatchEditDialog';
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

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const todaysDateKey = () => new Date().toISOString().slice(0, 10);

const MatchManager: React.FC = () => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();
  const [teamUser, setTeamUser] = useState<TeamUser | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerInput, setPlayerInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selfScore, setSelfScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [opponentPlayer, setOpponentPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<MatchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const timezoneGuess =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  const loadTeamUser = useCallback(async () => {
    const response = await teamApi('/api/team/current-user');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.teamCurrentUserFailed');
      throw new Error(message);
    }
    const data = (await response.json()) as TeamUser;
    setTeamUser(data);
  }, [teamApi, t]);

  const loadParticipants = useCallback(async () => {
    const response = await teamApi('/api/team/participants');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.teamParticipantsFailed');
      throw new Error(message);
    }
    const data = (await response.json()) as Participant[];
    setParticipants(data ?? []);
  }, [teamApi, t]);

  const loadMatches = useCallback(async () => {
    const response = await teamApi('/api/team/matches');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.fetchMatchesFailed');
      throw new Error(message);
    }
    const data = (await response.json()) as MatchRecord[];
    setMatches(data ?? []);
  }, [teamApi, t]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTeamUser(), loadParticipants(), loadMatches()]);
    } catch (e: any) {
      setError(e?.message || t('matchManager.teamLoadError'));
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadParticipants, loadTeamUser, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleQuickSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!teamUser?.can_edit) {
      setFormError(t('matchManager.teamReadOnlyNotice'));
      return;
    }
    if (!playerName || !selfScore || !opponentScore || !opponentTeam) {
      setFormError(t('matchManager.teamCreateFailed'));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        player: playerName,
        selfScore,
        opponentScore,
        opponentTeam,
        opponentPlayer,
        date: new Date().toISOString(),
        timezone: timezoneGuess,
      };
      const response = await teamApi('/api/team/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = (await response.text()) || t('matchManager.teamCreateFailed');
        throw new Error(message);
      }
      const created: MatchRecord = await response.json();
      setMatches((prev) => [created, ...prev]);
      setPlayerInput('');
      setPlayerName('');
      setSelfScore('');
      setOpponentScore('');
      setOpponentTeam('');
      setOpponentPlayer('');
    } catch (e: any) {
      setFormError(e?.message || t('matchManager.teamCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatedMatch = (updated: MatchRecord) => {
    setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await teamApi(`/api/team/matches/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = (await response.text()) || t('matchManager.teamDeleteFailed');
        throw new Error(message);
      }
      setMatches((prev) => prev.filter((match) => match.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e?.message || t('matchManager.teamDeleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const todayKey = todaysDateKey();
  const todayMatches = useMemo(
    () =>
      matches.filter((match) => {
        if (!match?.date) return false;
        return match.date.slice(0, 10) === todayKey;
      }),
    [matches, todayKey],
  );

  const stats = useMemo(() => {
    const total = matches.length;
    let wins = 0;
    let losses = 0;
    matches.forEach((match) => {
      const result = getOutcome(match);
      if (result === 'win') wins += 1;
      if (result === 'lose') losses += 1;
    });
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { total, wins, losses, winRate };
  }, [matches]);

  const renderOutcomeChip = (match: MatchRecord) => {
    const outcome = getOutcome(match);
    const labels: Record<string, string> = {
      win: t('matchManager.teamOutcomeWin'),
      lose: t('matchManager.teamOutcomeLose'),
      draw: t('matchManager.teamOutcomeDraw'),
      pending: t('matchManager.teamOutcomePending'),
    };
    const colors: Record<string, { bg: string; color: string }> = {
      win: { bg: '#e8f5e9', color: '#1b5e20' },
      lose: { bg: '#ffebee', color: '#c62828' },
      draw: { bg: '#e3f2fd', color: '#1565c0' },
      pending: { bg: '#fff3e0', color: '#ef6c00' },
    };
    const style = colors[outcome];
    return (
      <Chip
        label={labels[outcome]}
        size="small"
        sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600 }}
      />
    );
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error">{error}</Alert>
          <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={refreshAll}>
            {t('matchManager.teamReload')}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" fontWeight="bold">
            {t('matchManager.teamTitle')}
          </Typography>
          <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={refreshAll}>
            {t('matchManager.teamReload')}
          </Button>
        </Stack>

        {teamUser?.can_edit ? (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Stack spacing={2} component="form" onSubmit={handleQuickSubmit}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AddCircleOutlineRoundedIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  {t('matchManager.teamQuickInputTitle')}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t('matchManager.teamQuickInputDescription')}
              </Typography>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <Autocomplete
                options={participants}
                getOptionLabel={(option) => option.name}
                value={participants.find((p) => p.name === playerName) ?? null}
                inputValue={playerInput}
                onInputChange={(_, value) => {
                  setPlayerInput(value);
                  setPlayerName(value);
                }}
                onChange={(_, option) => {
                  const name = option?.name ?? '';
                  setPlayerName(name);
                  setPlayerInput(name);
                }}
                renderInput={(params) => (
                  <TextField {...params} label={t('matchManager.teamPlayerLabel')} placeholder={t('matchManager.teamPlayerLabel')} />
                )}
                freeSolo
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('matchManager.teamSelfScoreLabel')}
                  value={selfScore}
                  onChange={(e) => setSelfScore(e.target.value)}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  fullWidth
                />
                <TextField
                  label={t('matchManager.teamOpponentScoreLabel')}
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(e.target.value)}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  fullWidth
                />
              </Stack>
              <TextField
                label={t('matchManager.teamOpponentTeamLabel')}
                value={opponentTeam}
                onChange={(e) => setOpponentTeam(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('matchManager.teamOpponentPlayerLabel')}
                value={opponentPlayer}
                onChange={(e) => setOpponentPlayer(e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? t('matchManager.teamRecording') : t('matchManager.teamRecordButton')}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <Alert severity="info">{t('matchManager.teamReadOnlyNotice')}</Alert>
        )}

        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('matchManager.teamStatsTitle')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <StatChip label={t('matchManager.teamStatsTotal', { count: stats.total })} color="#1a237e" />
            <StatChip label={t('matchManager.teamStatsWins', { count: stats.wins })} color="#1b5e20" />
            <StatChip label={t('matchManager.teamStatsLosses', { count: stats.losses })} color="#c62828" />
            <StatChip label={t('matchManager.teamStatsWinRate', { rate: stats.winRate })} color="#006064" />
          </Stack>
        </Paper>

        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('matchManager.teamTodayMatches')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {todayMatches.length === 0 ? (
            <Alert severity="info">{t('matchManager.teamNoMatchesToday')}</Alert>
          ) : (
            <Stack spacing={2}>
              {todayMatches.map((match) => (
                <Paper key={match.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {renderOutcomeChip(match)}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {match.player || t('matchManager.teamUnknownPlayer')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(match.date)}
                      </Typography>
                      {match.timezone ? (
                        <Typography variant="caption" color="text.secondary">
                          ({match.timezone})
                        </Typography>
                      ) : null}
                      <Box sx={{ flex: 1 }} />
                      {teamUser?.can_edit ? (
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" onClick={() => setEditTarget(match)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteTarget(match)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : null}
                    </Stack>
                    <Typography variant="body2">
                      {t('matchManager.teamScoreLine', {
                        self: match.selfScore ?? '-',
                        opponent: match.opponentScore ?? '-',
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('matchManager.teamOpponentLine', {
                        team: match.opponentTeam || t('matchManager.teamUnknownTeam'),
                        player: match.opponentPlayer || t('matchManager.teamUnknownPlayer'),
                      })}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

      <MatchEditDialog
        open={Boolean(editTarget)}
        match={editTarget}
        participants={participants}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdatedMatch}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={deleteLoading ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle>{t('matchManager.teamDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>{t('matchManager.teamDeleteConfirm')}</Typography>
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            {t('matchManager.teamCancel')}
          </Button>
          <Button color="error" onClick={handleDelete} disabled={deleteLoading} variant="contained">
            {deleteLoading ? t('matchManager.teamDeleting') : t('matchManager.teamDelete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

type StatChipProps = {
  label: string;
  color: string;
};

const StatChip: React.FC<StatChipProps> = ({ label, color }) => (
  <Chip
    label={label}
    sx={{
      bgcolor: `${color}14`,
      color,
      fontWeight: 600,
      px: 2,
      py: 1,
      borderRadius: 2,
      fontSize: 14,
    }}
  />
);

export default MatchManager;
