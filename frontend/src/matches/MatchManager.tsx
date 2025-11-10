import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useTranslation } from 'react-i18next';
import { useTeamApi } from '../team/useTeamApi';
import MatchEditDialog from './MatchEditDialog';
import type { MatchRecord } from '../types/matchTypes';
import { useNavigate } from 'react-router-dom';

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

const MatchManager: React.FC = () => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();
  const navigate = useNavigate();
  const [teamUser, setTeamUser] = useState<TeamUser | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<MatchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // クイック入力は廃止（対戦ごとに詳細入力を行うため）

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

  const openMatches = useMemo(
    () => matches.filter((m) => m.result_status !== 'finalized'),
    [matches],
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
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate('/team-dashboard')}
            >
              {t('common.back')}
            </Button>
            <Typography variant="h4" fontWeight="bold">
              {t('matchManager.teamTitle')}
            </Typography>
          </Stack>
          <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={refreshAll}>
            {t('matchManager.teamReload')}
          </Button>
        </Stack>

        {!teamUser?.can_edit ? (
          <Alert severity="info">{t('matchManager.teamReadOnlyNotice')}</Alert>
        ) : null}

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
            {t('matchManager.teamOpenMatches')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {openMatches.length === 0 ? (
            <Alert severity="info">{t('matchManager.teamNoMatchesToday')}</Alert>
          ) : (
            <Stack spacing={2}>
              {openMatches.map((match) => (
                <Paper
                  key={match.id}
                  variant="outlined"
                  sx={{ p: 2, cursor: 'pointer' }}
                  onClick={() => {
                    window.location.href = `/team/matches/${match.id}/entry`;
                  }}
                >
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
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditTarget(match); }}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(match); }}>
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
