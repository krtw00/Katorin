import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTeamApi } from './useTeamApi';
import MatchEditDialog from '../matches/MatchEditDialog';
import type { MatchRecord } from '../types/matchTypes';

const COMPLETED_PAGE_SIZE = 25;

type Participant = {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type TeamUser = {
  id: string;
  name: string;
  can_edit: boolean; // 常に true（全チームメンバーが編集可能）
};

type CompletedMatchFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
};

type CompletedMatchesResponse = {
  data: MatchRecord[];
  total: number;
  page: number;
  pageSize: number;
};

type Props = {
  onSignOut: () => void;
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

const formatDateTime = (value?: string | null) => {
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

const outcomeMeta: Record<string, { labelKey: string; bgcolor: string; color: string }> = {
  win: { labelKey: 'matchManager.teamOutcomeWin', bgcolor: '#e8f5e9', color: '#1b5e20' },
  lose: { labelKey: 'matchManager.teamOutcomeLose', bgcolor: '#ffebee', color: '#c62828' },
  draw: { labelKey: 'matchManager.teamOutcomeDraw', bgcolor: '#e3f2fd', color: '#1565c0' },
  pending: { labelKey: 'matchManager.teamOutcomePending', bgcolor: '#fff3e0', color: '#ef6c00' },
};

const TeamDashboard: React.FC<Props> = ({ onSignOut }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authFetch = useAuthorizedFetch();
  const teamApi = useTeamApi();

  const [activeTab, setActiveTab] = useState<'matches' | 'members' | 'completed'>('matches');
  const [teamId, setTeamId] = useState<string | null>(
    (typeof window !== 'undefined' && window.localStorage.getItem('team_id')) || null,
  );
  const [teamName, setTeamName] = useState<string | null>(
    (typeof window !== 'undefined' && window.localStorage.getItem('team_name')) || null,
  );
  const [teamLoading, setTeamLoading] = useState<boolean>(true);
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [canEdit, setCanEdit] = useState<boolean>(false);

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberDialogName, setMemberDialogName] = useState('');
  const [memberDialogTarget, setMemberDialogTarget] = useState<Participant | null>(null);
  const [memberDialogError, setMemberDialogError] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const [memberDeleteTarget, setMemberDeleteTarget] = useState<Participant | null>(null);
  const [memberDeleteLoading, setMemberDeleteLoading] = useState(false);
  const [memberDeleteError, setMemberDeleteError] = useState<string | null>(null);

  const [matchEditTarget, setMatchEditTarget] = useState<MatchRecord | null>(null);
  const [matchDeleteTarget, setMatchDeleteTarget] = useState<MatchRecord | null>(null);
  const [matchDeleteLoading, setMatchDeleteLoading] = useState(false);
  const [matchDeleteError, setMatchDeleteError] = useState<string | null>(null);

  const [completedMatches, setCompletedMatches] = useState<MatchRecord[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedError, setCompletedError] = useState<string | null>(null);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedFilters, setCompletedFilters] = useState<CompletedMatchFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [appliedCompletedFilters, setAppliedCompletedFilters] = useState<CompletedMatchFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const [completedDetail, setCompletedDetail] = useState<{
    open: boolean;
    loading: boolean;
    data: MatchRecord | null;
    error: string | null;
  }>({ open: false, loading: false, data: null, error: null });

  const loadTeamProfile = useCallback(async () => {
    setTeamLoading(true);
    setTeamLoadError(null);
    try {
      const res = await authFetch('/api/team/me');
      if (res.status === 401) {
        setTeamLoadError(t('teamDashboard.loadTeamFailed'));
        return;
      }
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.loadTeamFailed');
        throw new Error(msg);
      }
      const data = await res.json();
      setTeamId(data.id);
      setTeamName(data.name);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('team_id', data.id);
          window.localStorage.setItem('team_name', data.name);
        } catch {
          // ignore storage errors
        }
      }
    } catch (e: any) {
      setTeamLoadError(e?.message || t('teamDashboard.loadTeamFailed'));
    } finally {
      setTeamLoading(false);
    }
  }, [authFetch, t]);

  const loadParticipants = useCallback(async () => {
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const res = await teamApi('/api/team/participants');
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.loadParticipantsFailed');
        throw new Error(msg);
      }
      const data: Participant[] = await res.json();
      setParticipants(data ?? []);
    } catch (e: any) {
      setParticipantsError(e?.message || t('teamDashboard.loadParticipantsFailed'));
    } finally {
      setParticipantsLoading(false);
    }
  }, [teamApi, t]);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const res = await teamApi('/api/team/matches?status=all');
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.loadMatchesFailed');
        throw new Error(msg);
      }
      const data: MatchRecord[] = await res.json();
      setMatches(data ?? []);
    } catch (e: any) {
      setMatchesError(e?.message || t('teamDashboard.loadMatchesFailed'));
    } finally {
      setMatchesLoading(false);
    }
  }, [teamApi, t]);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await teamApi('/api/team/current-user');
      if (!res.ok) {
        throw new Error((await res.text()) || t('teamDashboard.loadPermissionFailed'));
      }
      const data: TeamUser = await res.json();
      setCanEdit(Boolean(data.can_edit));
    } catch (e) {
      console.warn('Failed to load team permissions', e);
    }
  }, [teamApi, t]);

  const loadCompletedMatches = useCallback(
    async (pageValue: number, filters: CompletedMatchFilters) => {
      setCompletedLoading(true);
      setCompletedError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageValue));
        params.set('pageSize', String(COMPLETED_PAGE_SIZE));
        if (filters.search) params.set('search', filters.search.trim());
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        const res = await teamApi(`/api/matches/completed?${params.toString()}`);
        if (!res.ok) {
          const msg = (await res.text()) || t('teamDashboard.completedLoadFailed');
          throw new Error(msg);
        }
        const payload: CompletedMatchesResponse = await res.json();
        setCompletedMatches(payload.data ?? []);
        setCompletedTotal(payload.total ?? 0);
        setCompletedPage(payload.page ?? pageValue);
      } catch (e: any) {
        console.error('Failed to load completed matches:', e);
        setCompletedError(e?.message || t('teamDashboard.completedLoadFailed'));
      } finally {
        setCompletedLoading(false);
      }
    },
    [teamApi, t],
  );

  useEffect(() => {
    loadTeamProfile();
    loadPermissions();
    loadParticipants();
    loadMatches();
  }, [loadTeamProfile, loadPermissions, loadParticipants, loadMatches]);

  useEffect(() => {
    loadCompletedMatches(completedPage, appliedCompletedFilters);
  }, [loadCompletedMatches, completedPage, appliedCompletedFilters]);

  const participantsCount = participants.length;

  const stats = useMemo(() => {
    const total = matches.length;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    matches.forEach((match) => {
      const result = getOutcome(match);
      if (result === 'win') wins += 1;
      if (result === 'lose') losses += 1;
      if (result === 'draw') draws += 1;
    });
    const pending = matches.filter((m) => m.result_status !== 'finalized').length;
    const finalized = matches.filter((m) => m.result_status === 'finalized').length;
    return { total, wins, losses, draws, pending, finalized };
  }, [matches]);

  const pendingMatches = useMemo(
    () => matches.filter((match) => match.result_status !== 'finalized'),
    [matches],
  );
  const finalizedMatches = useMemo(
    () => matches.filter((match) => match.result_status === 'finalized').slice(0, 5),
    [matches],
  );

  const openMemberDialog = (participant?: Participant) => {
    setMemberDialogTarget(participant ?? null);
    setMemberDialogName(participant?.name ?? '');
    setMemberDialogError(null);
    setMemberDialogOpen(true);
  };

  const handleMemberSave = async () => {
    if (!memberDialogName.trim()) {
      setMemberDialogError(t('teamDashboard.memberNameRequired'));
      return;
    }
    setMemberSubmitting(true);
    setMemberDialogError(null);
    try {
      const body = JSON.stringify({ name: memberDialogName.trim() });
      const url = memberDialogTarget
        ? `/api/team/participants/${memberDialogTarget.id}`
        : '/api/team/participants';
      const method = memberDialogTarget ? 'PUT' : 'POST';
      const res = await teamApi(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.saveParticipantFailed');
        throw new Error(msg);
      }
      await loadParticipants();
      setMemberDialogOpen(false);
      setMemberDialogTarget(null);
      setMemberDialogName('');
    } catch (e: any) {
      setMemberDialogError(e?.message || t('teamDashboard.saveParticipantFailed'));
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleMemberDelete = async () => {
    if (!memberDeleteTarget) return;
    setMemberDeleteLoading(true);
    setMemberDeleteError(null);
    try {
      const res = await teamApi(`/api/team/participants/${memberDeleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const msg = (await res.text()) || t('teamDashboard.deleteParticipantFailed');
        throw new Error(msg);
      }
      await loadParticipants();
      setMemberDeleteTarget(null);
    } catch (e: any) {
      setMemberDeleteError(e?.message || t('teamDashboard.deleteParticipantFailed'));
    } finally {
      setMemberDeleteLoading(false);
    }
  };

  const handleMatchUpdated = (updated: MatchRecord) => {
    setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
  };

  const handleMatchDelete = async () => {
    if (!matchDeleteTarget) return;
    setMatchDeleteLoading(true);
    setMatchDeleteError(null);
    try {
      const res = await teamApi(`/api/team/matches/${matchDeleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const msg = (await res.text()) || t('teamDashboard.deleteMatchFailed');
        throw new Error(msg);
      }
      setMatches((prev) => prev.filter((match) => match.id !== matchDeleteTarget.id));
      setMatchDeleteTarget(null);
    } catch (e: any) {
      setMatchDeleteError(e?.message || t('teamDashboard.deleteMatchFailed'));
    } finally {
      setMatchDeleteLoading(false);
    }
  };

  const handleCompletedMatchDetail = async (matchId: string) => {
    setCompletedDetail({ open: true, loading: true, data: null, error: null });
    try {
      const res = await teamApi(`/api/matches/${matchId}`);
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.completedDetailFailed');
        throw new Error(msg);
      }
      const data: MatchRecord = await res.json();
      setCompletedDetail({ open: true, loading: false, data, error: null });
    } catch (e: any) {
      setCompletedDetail({ open: true, loading: false, data: null, error: e?.message || t('teamDashboard.completedDetailFailed') });
    }
  };

  const handleCompletedFilterApply = () => {
    setAppliedCompletedFilters(completedFilters);
    setCompletedPage(1);
  };

  const handleCompletedFilterReset = () => {
    const emptyFilters = { search: '', dateFrom: '', dateTo: '' };
    setCompletedFilters(emptyFilters);
    setAppliedCompletedFilters(emptyFilters);
    setCompletedPage(1);
  };

  const resolvedTeamName = teamName ?? t('teamDashboard.unknownTeam');

  const tabPanels = {
    members: (
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#fff', borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 3 }}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight="bold">
              {t('teamDashboard.membersTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('teamDashboard.membersDescription')}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => openMemberDialog()}
          >
            {t('teamDashboard.addMember')}
          </Button>
        </Stack>
        {participantsError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {participantsError}
          </Alert>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={t('teamDashboard.totalMembers', { count: participantsCount })} />
          <Button
            startIcon={<RefreshRoundedIcon />}
            size="small"
            variant="outlined"
            onClick={loadParticipants}
          >
            {t('teamDashboard.refresh')}
          </Button>
        </Stack>
        {participantsLoading ? (
          <LinearProgress sx={{ mb: 2 }} />
        ) : null}
        {participants.length === 0 && !participantsLoading ? (
          <Alert severity="info">{t('teamDashboard.noMembers')}</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('teamDashboard.memberNameLabel')}</TableCell>
                  <TableCell width={200}>{t('teamDashboard.memberUpdatedAt')}</TableCell>
                  <TableCell width={140} align="right">
                    {t('teamDashboard.actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id} hover>
                    <TableCell>{participant.name}</TableCell>
                    <TableCell>{participant.updated_at ? formatDateTime(participant.updated_at) : '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openMemberDialog(participant)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setMemberDeleteTarget(participant)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    ),
    matches: (
      <Stack spacing={3}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="h6" fontWeight="bold">
                {t('teamDashboard.myMatchesTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('teamDashboard.myMatchesDescription')}
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadMatches}
            >
              {t('teamDashboard.refresh')}
            </Button>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <StatChip label={t('teamDashboard.statTotal', { value: stats.total })} color="#1e293b" />
            <StatChip label={t('teamDashboard.statWins', { value: stats.wins })} color="#065f46" />
            <StatChip label={t('teamDashboard.statLosses', { value: stats.losses })} color="#b91c1c" />
            <StatChip label={t('teamDashboard.statDraws', { value: stats.draws })} color="#1d4ed8" />
            <StatChip label={t('teamDashboard.statPending', { value: stats.pending })} color="#b45309" />
          </Stack>
          {matchesError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {matchesError}
            </Alert>
          ) : null}
          {matchesLoading ? <LinearProgress sx={{ mt: 2 }} /> : null}
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          <SectionHeader
            title={t('teamDashboard.pendingSectionTitle')}
            subtitle={t('teamDashboard.pendingSectionDescription')}
          />
          {pendingMatches.length === 0 && !matchesLoading ? (
            <Alert severity="info">{t('teamDashboard.noPendingMatches')}</Alert>
          ) : (
            <Stack spacing={2}>
              {pendingMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  canEdit={canEdit}
                  onEdit={() => setMatchEditTarget(match)}
                  onDelete={() => setMatchDeleteTarget(match)}
                  onReport={() => navigate(`/team/matches/${match.id}/entry`)}
                  onView={() => handleCompletedMatchDetail(match.id)}
                  t={t}
                  teamName={resolvedTeamName}
                />
              ))}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          <SectionHeader
            title={t('teamDashboard.completedSectionTitle')}
            subtitle={t('teamDashboard.completedSectionDescription')}
          />
          {finalizedMatches.length === 0 ? (
            <Alert severity="info">{t('teamDashboard.noCompletedMatches')}</Alert>
          ) : (
            <Stack spacing={2}>
              {finalizedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  canEdit={false}
                  onReport={() => navigate(`/team/matches/${match.id}/entry`)}
                  onView={() => handleCompletedMatchDetail(match.id)}
                  t={t}
                  teamName={resolvedTeamName}
                  compact
                />
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    ),
    completed: (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight="bold">
              {t('teamDashboard.completedTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('teamDashboard.completedDescription')}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => loadCompletedMatches(completedPage, appliedCompletedFilters)}
          >
            {t('teamDashboard.refresh')}
          </Button>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            label={t('teamDashboard.completedSearch')}
            value={completedFilters.search}
            onChange={(e) => setCompletedFilters((prev) => ({ ...prev, search: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date"
              label={t('teamDashboard.completedDateFrom')}
              value={completedFilters.dateFrom}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setCompletedFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              fullWidth
            />
            <TextField
              type="date"
              label={t('teamDashboard.completedDateTo')}
              value={completedFilters.dateTo}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setCompletedFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleCompletedFilterApply}>
              {t('teamDashboard.completedApplyFilters')}
            </Button>
            <Button onClick={handleCompletedFilterReset}>{t('teamDashboard.completedResetFilters')}</Button>
          </Stack>
        </Stack>
        {completedError ? <Alert severity="error">{completedError}</Alert> : null}
        {completedLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}
        {completedMatches.length === 0 && !completedLoading ? (
          <Alert severity="info">{t('teamDashboard.completedEmpty')}</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('teamDashboard.completedMatchColumn')}</TableCell>
                  <TableCell>{t('teamDashboard.completedScoreColumn')}</TableCell>
                  <TableCell>{t('teamDashboard.completedDateColumn')}</TableCell>
                  <TableCell width={120} align="right">
                    {t('teamDashboard.actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completedMatches.map((match) => (
                  <TableRow key={match.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight="bold">
                          {match.team ?? t('teamDashboard.unknownTeam')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          vs. {match.opponentTeam ?? t('teamDashboard.unknownTeam')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography>
                        {t('teamDashboard.scoreValue', {
                          self: match.selfScore ?? '-',
                          opponent: match.opponentScore ?? '-',
                        })}
                      </Typography>
                      <ResultChip match={match} t={t} />
                    </TableCell>
                    <TableCell>{formatDateTime(match.date)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleCompletedMatchDetail(match.id)}
                        startIcon={<VisibilityRoundedIcon fontSize="small" />}
                      >
                        {t('teamDashboard.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {completedTotal > COMPLETED_PAGE_SIZE ? (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Pagination
              count={Math.ceil(completedTotal / COMPLETED_PAGE_SIZE)}
              page={completedPage}
              onChange={(_, pageValue) => setCompletedPage(pageValue)}
              color="primary"
            />
          </Stack>
        ) : null}
      </Paper>
    ),
  };

  const tabValue = tabPanels[activeTab];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a' }}>
      <Box
        component="header"
        sx={{
          bgcolor: '#0f172a',
          color: '#fff',
          px: { xs: 2, md: 4 },
          py: 2.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight="bold">
              {t('teamDashboard.title')}
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.72)">
              {teamName ? t('teamDashboard.subtitle', { teamName }) : t('teamDashboard.subtitleGeneric')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutRoundedIcon />}
              onClick={onSignOut}
            >
              {t('teamDashboard.signOut')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {teamLoadError ? (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={loadTeamProfile}>
                {t('teamDashboard.retry')}
              </Button>
            }
          >
            {teamLoadError}
          </Alert>
        ) : null}
        {teamLoading && !teamId ? <LinearProgress sx={{ mb: 3 }} /> : null}

        <Paper elevation={0} sx={{ mb: 3, p: 3, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('teamDashboard.summaryLabel')}
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {resolvedTeamName}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Chip label={t('teamDashboard.totalMembers', { count: participantsCount })} />
              <Chip label={t('teamDashboard.statPendingChip', { value: stats.pending })} />
              <Chip label={t('teamDashboard.statCompletedChip', { value: stats.finalized })} />
            </Stack>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, next) => setActiveTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <Tab value="matches" label={t('teamDashboard.matchesTab')} />
            <Tab value="members" label={t('teamDashboard.membersTab')} />
            <Tab value="completed" label={t('teamDashboard.completedTab')} />
          </Tabs>
        </Paper>

        {tabValue}
      </Box>

      <MatchEditDialog
        open={Boolean(matchEditTarget)}
        match={matchEditTarget}
        participants={participants}
        onClose={() => setMatchEditTarget(null)}
        onUpdated={handleMatchUpdated}
      />

      <Dialog open={Boolean(matchDeleteTarget)} onClose={matchDeleteLoading ? undefined : () => setMatchDeleteTarget(null)}>
        <DialogTitle>{t('teamDashboard.deleteMatchTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>{t('teamDashboard.deleteMatchBody')}</Typography>
            {matchDeleteError ? <Alert severity="error">{matchDeleteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDeleteTarget(null)} disabled={matchDeleteLoading}>
            {t('teamDashboard.cancel')}
          </Button>
          <Button color="error" variant="contained" onClick={handleMatchDelete} disabled={matchDeleteLoading}>
            {matchDeleteLoading ? t('teamDashboard.deleting') : t('teamDashboard.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={memberDialogOpen} onClose={memberSubmitting ? undefined : () => setMemberDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          {memberDialogTarget ? t('teamDashboard.editMember') : t('teamDashboard.addMember')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {memberDialogError ? <Alert severity="error">{memberDialogError}</Alert> : null}
            <TextField
              label={t('teamDashboard.memberNameLabel')}
              fullWidth
              value={memberDialogName}
              onChange={(e) => setMemberDialogName(e.target.value)}
              autoFocus
            />
            <Typography variant="caption" color="text.secondary">
              {t('teamDashboard.memberDialogHelper')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)} disabled={memberSubmitting}>
            {t('teamDashboard.cancel')}
          </Button>
          <Button variant="contained" onClick={handleMemberSave} disabled={memberSubmitting}>
            {memberSubmitting ? t('teamDashboard.saving') : t('teamDashboard.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(memberDeleteTarget)} onClose={memberDeleteLoading ? undefined : () => setMemberDeleteTarget(null)}>
        <DialogTitle>{t('teamDashboard.deleteMember')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              {t('teamDashboard.confirmDeleteMember', { name: memberDeleteTarget?.name ?? '' })}
            </Typography>
            {memberDeleteError ? <Alert severity="error">{memberDeleteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDeleteTarget(null)} disabled={memberDeleteLoading}>
            {t('teamDashboard.cancel')}
          </Button>
          <Button color="error" variant="contained" onClick={handleMemberDelete} disabled={memberDeleteLoading}>
            {memberDeleteLoading ? t('teamDashboard.deleting') : t('teamDashboard.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={completedDetail.open}
        onClose={() => setCompletedDetail({ open: false, loading: false, data: null, error: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {t('teamDashboard.completedDetailTitle')}
          <IconButton size="small" onClick={() => setCompletedDetail({ open: false, loading: false, data: null, error: null })}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {completedDetail.loading ? (
            <LinearProgress />
          ) : completedDetail.error ? (
            <Alert severity="error">{completedDetail.error}</Alert>
          ) : completedDetail.data ? (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6" fontWeight="bold">
                  {completedDetail.data.team ?? t('teamDashboard.unknownTeam')} vs.{' '}
                  {completedDetail.data.opponentTeam ?? t('teamDashboard.unknownTeam')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(completedDetail.data.date)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <ResultChip match={completedDetail.data} t={t} />
                <Chip
                  label={t('teamDashboard.scoreValue', {
                    self: completedDetail.data.selfScore ?? '-',
                    opponent: completedDetail.data.opponentScore ?? '-',
                  })}
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <DetailRow
                icon={<EventRoundedIcon fontSize="small" />}
                label={t('teamDashboard.completedMatchupLabel')}
                value={t('teamDashboard.matchupLabel', {
                  home: completedDetail.data.team ?? resolvedTeamName,
                  away: completedDetail.data.opponentTeam ?? t('teamDashboard.unknownTeam'),
                })}
              />
              <DetailRow
                icon={<ScheduleRoundedIcon fontSize="small" />}
                label={t('teamDashboard.completedDateColumn')}
                value={formatDateTime(completedDetail.data.date) || t('teamDashboard.noDate')}
              />
              {completedDetail.data.tournament_id ? (
                <DetailRow
                  icon={<OpenInNewRoundedIcon fontSize="small" />}
                  label={t('teamDashboard.completedTournament')}
                  value={completedDetail.data.tournament_id}
                />
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletedDetail({ open: false, loading: false, data: null, error: null })}>
            {t('teamDashboard.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

type MatchCardProps = {
  match: MatchRecord;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onView?: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  teamName: string;
  compact?: boolean;
};

const MatchCard: React.FC<MatchCardProps> = ({ match, canEdit, onEdit, onDelete, onReport, onView, t, teamName, compact }) => {
  const date = formatDateTime(match.date);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight="bold">
            {t('teamDashboard.matchupLabel', {
              home: teamName,
              away: match.opponentTeam ?? t('teamDashboard.unknownTeam'),
            })}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <ResultChip match={match} t={t} />
        </Stack>
        <Typography variant="body2">
          {t('teamDashboard.scoreValue', {
            self: match.selfScore ?? '-',
            opponent: match.opponentScore ?? '-',
          })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {date || t('teamDashboard.noDate')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {onReport && match.result_status !== 'finalized' ? (
            <Button variant="contained" onClick={onReport} startIcon={<OpenInNewRoundedIcon fontSize="small" />}>
              {t('teamDashboard.reportScore')}
            </Button>
          ) : null}
          {onView ? (
            <Button variant="outlined" onClick={onView} startIcon={<VisibilityRoundedIcon fontSize="small" />}>
              {t('teamDashboard.viewDetails')}
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          {canEdit && !compact ? (
            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={onEdit}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
};

type SectionHeaderProps = {
  title: string;
  subtitle: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle }) => (
  <Stack spacing={0.5} sx={{ mb: 2 }}>
    <Typography variant="h6" fontWeight="bold">
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {subtitle}
    </Typography>
  </Stack>
);

type StatChipProps = {
  label: string;
  color: string;
};

const StatChip: React.FC<StatChipProps> = ({ label, color }) => (
  <Chip
    label={label}
    sx={{
      bgcolor: `${color}12`,
      color,
      fontWeight: 600,
      borderRadius: 2,
    }}
  />
);

type ResultChipProps = {
  match: MatchRecord;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const ResultChip: React.FC<ResultChipProps> = ({ match, t }) => {
  const outcome = getOutcome(match);
  const meta = outcomeMeta[outcome] ?? outcomeMeta.pending;
  return (
    <Chip
      label={t(meta.labelKey)}
      size="small"
      sx={{ bgcolor: meta.bgcolor, color: meta.color, fontWeight: 600 }}
    />
  );
};

type DetailRowProps = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => (
  <Stack direction="row" spacing={2} alignItems="center">
    {icon ? <Box sx={{ color: 'text.secondary' }}>{icon}</Box> : null}
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Stack>
  </Stack>
);

export default TeamDashboard;
