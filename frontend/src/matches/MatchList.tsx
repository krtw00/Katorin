import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import MatchEditDialog from './MatchEditDialog';
import { useTeamApi } from '../team/useTeamApi';
import type { MatchRecord } from '../types/matchTypes';

type Participant = {
  id: string;
  name: string;
};

type TeamUser = {
  id: string;
  name: string;
  can_edit: boolean;
};

const PAGE_SIZE = 20;

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

const MatchList: React.FC = () => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [teamUser, setTeamUser] = useState<TeamUser | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerFilter, setPlayerFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    player: '',
    start: '',
    end: '',
  });

  const [page, setPage] = useState(1);

  const [editTarget, setEditTarget] = useState<MatchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadTeamUser = useCallback(async () => {
    const response = await teamApi('/api/team/current-user');
    if (!response.ok) {
      const message = (await response.text()) || t('matchList.loadPermissionFailed');
      throw new Error(message);
    }
    const data: TeamUser = await response.json();
    setTeamUser(data);
  }, [teamApi, t]);

  const loadParticipants = useCallback(async () => {
    const response = await teamApi('/api/team/participants');
    if (!response.ok) {
      const message = (await response.text()) || t('matchList.loadParticipantsFailed');
      throw new Error(message);
    }
    const data: Participant[] = await response.json();
    setParticipants(data ?? []);
  }, [teamApi, t]);

  const loadMatches = useCallback(async () => {
    const response = await teamApi('/api/team/matches');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.fetchMatchesFailed');
      throw new Error(message);
    }
    const data: MatchRecord[] = await response.json();
    setMatches(data ?? []);
  }, [teamApi, t]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTeamUser(), loadParticipants(), loadMatches()]);
    } catch (e: any) {
      setError(e?.message || t('matchList.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadParticipants, loadTeamUser, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filteredMatches = useMemo(() => {
    const { player, start, end } = appliedFilters;
    return matches.filter((match) => {
      const playerName = match.player ?? '';
      if (player && !playerName.toLowerCase().includes(player.toLowerCase())) {
        return false;
      }
      if (start && match.date && match.date < `${start}T00:00:00`) {
        return false;
      }
      if (end && match.date && match.date > `${end}T23:59:59`) {
        return false;
      }
      return true;
    });
  }, [matches, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const pageMatches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMatches.slice(start, start + PAGE_SIZE);
  }, [filteredMatches, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const outcomeChip = (match: MatchRecord) => {
    const parseScore = (value?: string | null) => {
      if (!value) return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const self = parseScore(match.selfScore);
    const opp = parseScore(match.opponentScore);
    let label = t('matchList.resultPending');
    let color: 'success' | 'error' | 'default' = 'default';
    if (self !== null && opp !== null) {
      if (self > opp) {
        label = t('matchList.resultWin');
        color = 'success';
      } else if (self < opp) {
        label = t('matchList.resultLose');
        color = 'error';
      } else {
        label = t('matchList.resultDraw');
        color = 'default';
      }
    }
    return <Chip size="small" color={color} label={label} />;
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      player: playerFilter.trim(),
      start: startDateFilter,
      end: endDateFilter,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setPlayerFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setAppliedFilters({ player: '', start: '', end: '' });
    setPage(1);
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
        const message = (await response.text()) || t('matchList.deleteFailed');
        throw new Error(message);
      }
      setMatches((prev) => prev.filter((match) => match.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e?.message || t('matchList.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
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
          <Button variant="outlined" onClick={refreshAll}>
            {t('matchList.retry')}
          </Button>
        </Stack>
      </Box>
    );
  }

  const canEdit = Boolean(teamUser?.can_edit);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Typography variant="h4" fontWeight="bold">
            {t('matchList.title')}
          </Typography>
          <Button variant="outlined" onClick={refreshAll}>
            {t('matchList.reload')}
          </Button>
        </Stack>

        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {t('matchList.filters')}
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid xs={12} md={4}>
              <TextField
                fullWidth
                label={t('matchList.searchPlayer')}
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value)}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={t('matchList.dateFrom')}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={t('matchList.dateTo')}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleApplyFilters}>
              {t('matchList.filter')}
            </Button>
            <Button variant="outlined" onClick={handleClearFilters}>
              {t('matchList.clear')}
            </Button>
          </Stack>
        </Paper>

        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {t('matchList.summary')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Chip label={t('matchList.totalMatches', { count: filteredMatches.length })} />
            <Chip
              color="success"
              label={t('matchList.winCount', {
                count: filteredMatches.filter((m) => {
                  const self = Number(m.selfScore ?? NaN);
                  const opp = Number(m.opponentScore ?? NaN);
                  return Number.isFinite(self) && Number.isFinite(opp) && self > opp;
                }).length,
              })}
            />
            <Chip
              color="error"
              label={t('matchList.lossCount', {
                count: filteredMatches.filter((m) => {
                  const self = Number(m.selfScore ?? NaN);
                  const opp = Number(m.opponentScore ?? NaN);
                  return Number.isFinite(self) && Number.isFinite(opp) && self < opp;
                }).length,
              })}
            />
          </Stack>
        </Paper>

        {filteredMatches.length === 0 ? (
          <Alert severity="info">{t('matchList.noMatches')}</Alert>
        ) : isMobile ? (
          <Stack spacing={2}>
            {pageMatches.map((match) => (
              <Card key={match.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {outcomeChip(match)}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {match.player || t('matchList.unknownPlayer')}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      {match.timezone ? (
                        <Typography variant="caption" color="text.secondary">
                          {match.timezone}
                        </Typography>
                      ) : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(match.date)}
                    </Typography>
                    <Typography variant="body2">
                      {t('matchList.scoreLine', {
                        self: match.selfScore ?? '-',
                        opponent: match.opponentScore ?? '-',
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('matchList.opponentLine', {
                        team: match.opponentTeam || t('matchList.unknownTeam'),
                        player: match.opponentPlayer || t('matchList.unknownPlayer'),
                      })}
                    </Typography>
                    <Divider />
                    <Typography variant="caption" color="text.secondary">
                      {t('matchList.statusLabel', {
                        status:
                          match.result_status === 'finalized'
                            ? t('matchList.statusFinalized')
                            : t('matchList.statusDraft'),
                      })}
                    </Typography>
                    {canEdit ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => setEditTarget(match)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteTarget(match)}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('matchList.date')}</TableCell>
                  <TableCell>{t('matchList.player')}</TableCell>
                  <TableCell>{t('matchList.score')}</TableCell>
                  <TableCell>{t('matchList.opponentTeam')}</TableCell>
                  <TableCell>{t('matchList.opponentPlayer')}</TableCell>
                  <TableCell>{t('matchList.result')}</TableCell>
                  <TableCell>{t('matchList.status')}</TableCell>
                  {canEdit ? <TableCell align="right">{t('matchList.actions')}</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {pageMatches.map((match) => (
                  <TableRow key={match.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{formatDate(match.date)}</Typography>
                        {match.timezone ? (
                          <Typography variant="caption" color="text.secondary">
                            {match.timezone}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{match.player || t('matchList.unknownPlayer')}</TableCell>
                    <TableCell>
                      {t('matchList.scoreLine', {
                        self: match.selfScore ?? '-',
                        opponent: match.opponentScore ?? '-',
                      })}
                    </TableCell>
                    <TableCell>{match.opponentTeam || t('matchList.unknownTeam')}</TableCell>
                    <TableCell>{match.opponentPlayer || t('matchList.unknownPlayer')}</TableCell>
                    <TableCell>{outcomeChip(match)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={match.result_status === 'finalized' ? 'success' : 'default'}
                        label={
                          match.result_status === 'finalized'
                            ? t('matchList.statusFinalized')
                            : t('matchList.statusDraft')
                        }
                      />
                    </TableCell>
                    {canEdit ? (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" onClick={() => setEditTarget(match)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteTarget(match)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        ) : null}
      </Stack>

      <MatchEditDialog
        open={Boolean(editTarget)}
        match={editTarget}
        participants={participants}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdatedMatch}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={deleteLoading ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle>{t('matchList.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>{t('matchList.deleteConfirm')}</Typography>
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            {t('matchList.cancel')}
          </Button>
          <Button color="error" onClick={handleDelete} disabled={deleteLoading} variant="contained">
            {deleteLoading ? t('matchList.deleting') : t('matchList.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MatchList;
