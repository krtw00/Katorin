import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

type TeamSummary = {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  updated_at?: string | null;
};

type Participant = {
  id: string;
  team_id: string;
  name: string;
  can_edit: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type MatchRecord = {
  id: string;
  team: string | null;
  team_id: string | null;
  player: string | null;
  deck: string | null;
  selfScore: string | null;
  opponentScore: string | null;
  opponentTeam: string | null;
  opponentPlayer: string | null;
  opponentDeck: string | null;
  date: string | null;
  tournament_id: string | null;
  round_id: string | null;
  created_at?: string;
  updated_at?: string | null;
};

type ParticipantDialogState =
  | { open: false }
  | {
      open: true;
      mode: 'create';
      draft: { name: string; can_edit: boolean };
      error: string | null;
      submitting: boolean;
    }
  | {
      open: true;
      mode: 'edit';
      participantId: string;
      draft: { name: string; can_edit: boolean };
      error: string | null;
      submitting: boolean;
    };

type MatchDialogState =
  | { open: false }
  | {
      open: true;
      mode: 'create';
      draft: MatchDraft;
      error: string | null;
      submitting: boolean;
    }
  | {
      open: true;
      mode: 'edit';
      matchId: string;
      draft: MatchDraft;
      error: string | null;
      submitting: boolean;
    };

type MatchDraft = {
  player: string;
  deck: string;
  selfScore: string;
  opponentScore: string;
  opponentTeam: string;
  opponentPlayer: string;
  opponentDeck: string;
  date: string;
  tournamentId: string;
  roundId: string;
};

const createEmptyMatchDraft = (): MatchDraft => ({
  player: '',
  deck: '',
  selfScore: '',
  opponentScore: '',
  opponentTeam: '',
  opponentPlayer: '',
  opponentDeck: '',
  date: '',
  tournamentId: '',
  roundId: '',
});

type TeamDashboardProps = {
  onSignOut?: () => void;
};

const TeamDashboard: React.FC<TeamDashboardProps> = ({ onSignOut }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();

  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [tab, setTab] = useState<'members' | 'matches'>('members');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [participantDialog, setParticipantDialog] = useState<ParticipantDialogState>({ open: false });
  const [participantDeleteTarget, setParticipantDeleteTarget] = useState<Participant | null>(null);
  const [participantDeleteSubmitting, setParticipantDeleteSubmitting] = useState(false);
  const [participantDeleteError, setParticipantDeleteError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matchDialog, setMatchDialog] = useState<MatchDialogState>({ open: false });
  const [matchDeleteTarget, setMatchDeleteTarget] = useState<MatchRecord | null>(null);
  const [matchDeleteSubmitting, setMatchDeleteSubmitting] = useState(false);
  const [matchDeleteError, setMatchDeleteError] = useState<string | null>(null);

  const formatDate = useCallback(
    (value?: string | null) => {
      if (!value) return t('teamDashboard.noDate');
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(parsed);
    },
    [t],
  );

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const response = await authFetch('/api/team/me');
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? ''
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error('unexpected response');
      }
      const data: TeamSummary = await response.json();
      setTeam(data);
    } catch (err) {
      console.error('[teamDashboard] fetchTeam failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.loadTeamFailed');
      setTeamError(message);
    } finally {
      setTeamLoading(false);
    }
  }, [authFetch, t]);

  const fetchParticipants = useCallback(async () => {
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const response = await authFetch('/api/team/participants');
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? ''
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error('unexpected response');
      }
      const data: Participant[] = await response.json();
      setParticipants(data);
    } catch (err) {
      console.error('[teamDashboard] fetchParticipants failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.loadParticipantsFailed');
      setParticipantsError(message);
    } finally {
      setParticipantsLoading(false);
    }
  }, [authFetch, t]);

  const fetchMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const response = await authFetch('/api/team/matches');
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? ''
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error('unexpected response');
      }
      const data: MatchRecord[] = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('[teamDashboard] fetchMatches failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.loadMatchesFailed');
      setMatchesError(message);
    } finally {
      setMatchesLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    if (!team) return;
    fetchParticipants();
    fetchMatches();
  }, [team, fetchParticipants, fetchMatches]);

  const handleParticipantDialogClose = () => {
    setParticipantDialog({ open: false });
  };

  const openCreateParticipantDialog = () => {
    setParticipantDialog({
      open: true,
      mode: 'create',
      draft: { name: '', can_edit: false },
      error: null,
      submitting: false,
    });
  };

  const openEditParticipantDialog = (participant: Participant) => {
    setParticipantDialog({
      open: true,
      mode: 'edit',
      participantId: participant.id,
      draft: { name: participant.name, can_edit: participant.can_edit },
      error: null,
      submitting: false,
    });
  };

  const handleParticipantDraftChange = (field: 'name' | 'can_edit', value: string | boolean) => {
    if (!participantDialog.open) return;
    setParticipantDialog((prev) => {
      if (!prev.open) return prev;
      return {
        ...prev,
        draft: {
          ...prev.draft,
          [field]: value,
        },
      };
    });
  };

  const handleParticipantSubmit = async () => {
    if (!participantDialog.open) return;
    const { draft } = participantDialog;
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setParticipantDialog((prev) => (prev.open ? { ...prev, error: t('teamDashboard.memberNameRequired') } : prev));
      return;
    }

    setParticipantDialog((prev) => (prev.open ? { ...prev, submitting: true, error: null } : prev));

    try {
      const payload = {
        name: trimmedName,
        canEdit: draft.can_edit,
      };

      if (participantDialog.mode === 'create') {
        const response = await authFetch('/api/team/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
      } else {
        const response = await authFetch(`/api/team/participants/${participantDialog.participantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
      }

      handleParticipantDialogClose();
      fetchParticipants();
    } catch (err) {
      console.error('[teamDashboard] participant submit failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.saveParticipantFailed');
      setParticipantDialog((prev) => (prev.open ? { ...prev, submitting: false, error: message } : prev));
    }
  };

  const handleParticipantDelete = async () => {
    if (!participantDeleteTarget) return;
    setParticipantDeleteSubmitting(true);
    setParticipantDeleteError(null);
    try {
      const response = await authFetch(`/api/team/participants/${participantDeleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      setParticipantDeleteTarget(null);
      fetchParticipants();
    } catch (err) {
      console.error('[teamDashboard] delete participant failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.deleteParticipantFailed');
      setParticipantDeleteError(message);
    } finally {
      setParticipantDeleteSubmitting(false);
    }
  };

  const handleMatchDialogClose = () => {
    setMatchDialog({ open: false });
  };

  const openCreateMatchDialog = () => {
    setMatchDialog({
      open: true,
      mode: 'create',
      draft: createEmptyMatchDraft(),
      error: null,
      submitting: false,
    });
  };

  const openEditMatchDialog = (match: MatchRecord) => {
    setMatchDialog({
      open: true,
      mode: 'edit',
      matchId: match.id,
      draft: {
        player: match.player ?? '',
        deck: match.deck ?? '',
        selfScore: match.selfScore ?? '',
        opponentScore: match.opponentScore ?? '',
        opponentTeam: match.opponentTeam ?? '',
        opponentPlayer: match.opponentPlayer ?? '',
        opponentDeck: match.opponentDeck ?? '',
        date: match.date ?? '',
        tournamentId: match.tournament_id ?? '',
        roundId: match.round_id ?? '',
      },
      error: null,
      submitting: false,
    });
  };

  const handleMatchDraftChange = (field: keyof MatchDraft, value: string) => {
    if (!matchDialog.open) return;
    setMatchDialog((prev) => {
      if (!prev.open) return prev;
      return {
        ...prev,
        draft: {
          ...prev.draft,
          [field]: value,
        },
      };
    });
  };

  const handleMatchSubmit = async () => {
    if (!matchDialog.open) return;
    setMatchDialog((prev) => (prev.open ? { ...prev, submitting: true, error: null } : prev));

    const payload = {
      player: matchDialog.draft.player,
      deck: matchDialog.draft.deck,
      selfScore: matchDialog.draft.selfScore,
      opponentScore: matchDialog.draft.opponentScore,
      opponentTeam: matchDialog.draft.opponentTeam,
      opponentPlayer: matchDialog.draft.opponentPlayer,
      opponentDeck: matchDialog.draft.opponentDeck,
      date: matchDialog.draft.date,
      tournamentId: matchDialog.draft.tournamentId,
      roundId: matchDialog.draft.roundId,
    };

    try {
      if (matchDialog.mode === 'create') {
        const response = await authFetch('/api/team/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
      } else {
        const response = await authFetch(`/api/team/matches/${matchDialog.matchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
      }

      handleMatchDialogClose();
      fetchMatches();
    } catch (err) {
      console.error('[teamDashboard] match submit failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.saveMatchFailed');
      setMatchDialog((prev) => (prev.open ? { ...prev, submitting: false, error: message } : prev));
    }
  };

  const handleMatchDelete = async () => {
    if (!matchDeleteTarget) return;
    setMatchDeleteSubmitting(true);
    setMatchDeleteError(null);
    try {
      const response = await authFetch(`/api/team/matches/${matchDeleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      setMatchDeleteTarget(null);
      fetchMatches();
    } catch (err) {
      console.error('[teamDashboard] delete match failed:', err);
      const message = err instanceof Error ? err.message : t('teamDashboard.deleteMatchFailed');
      setMatchDeleteError(message);
    } finally {
      setMatchDeleteSubmitting(false);
    }
  };

  const participantSummary = useMemo(
    () => ({
      editableCount: participants.filter((p) => p.can_edit).length,
      total: participants.length,
    }),
    [participants],
  );

  if (teamLoading) {
    return (
      <Stack sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f6fb' }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (teamError) {
    return (
      <Stack sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f6fb', p: 3 }}>
        <Paper sx={{ p: 4, maxWidth: 480 }}>
          <Stack spacing={3} alignItems="center">
            <Alert severity="error" sx={{ width: '100%' }}>
              {teamError}
            </Alert>
            <Button variant="contained" onClick={fetchTeam}>
              {t('teamDashboard.retry')}
            </Button>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <Stack sx={{ minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <Box
        component="header"
        sx={{
          bgcolor: '#1f2a44',
          color: '#fff',
          px: { xs: 2, md: 4 },
          py: 3,
          boxShadow: '0 2px 12px rgba(16, 33, 64, 0.35)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight="bold">
              {t('teamDashboard.title')}
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.8)">
              {t('teamDashboard.subtitle', { teamName: team.name })}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              color="default"
              label={t('teamDashboard.memberCount', {
                total: participantSummary.total,
                editable: participantSummary.editableCount,
              })}
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }}
            />
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                fetchParticipants();
                fetchMatches();
              }}
              startIcon={<Refresh />}
            >
              {t('teamDashboard.refresh')}
            </Button>
            <Button variant="contained" color="secondary" onClick={onSignOut}>
              {t('teamDashboard.signOut')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, flexGrow: 1 }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 20px 40px rgba(15, 30, 60, 0.08)' }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              borderBottom: '1px solid #e4e7f1',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 15,
              },
            }}
          >
            <Tab value="members" label={t('teamDashboard.membersTab')} />
            <Tab value="matches" label={t('teamDashboard.matchesTab')} />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {tab === 'members' ? (
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight="bold">
                      {t('teamDashboard.membersSection')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('teamDashboard.membersDescription')}
                    </Typography>
                  </Stack>
                  <Button variant="contained" startIcon={<Add />} onClick={openCreateParticipantDialog} sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}>
                    {t('teamDashboard.addMember')}
                  </Button>
                </Stack>

                {participantsError ? <Alert severity="error">{participantsError}</Alert> : null}

                {participantsLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </Stack>
                ) : participants.length === 0 ? (
                  <Alert severity="info">{t('teamDashboard.noMembers')}</Alert>
                ) : (
                  <List disablePadding>
                    {participants.map((participant) => (
                      <ListItem
                        key={participant.id}
                        sx={{
                          mb: 1.5,
                          border: '1px solid #e5e8f0',
                          borderRadius: 2,
                          bgcolor: '#fafbff',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight="bold" color="#1f2a44">
                              {participant.name}
                            </Typography>
                          }
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={
                                  participant.can_edit
                                    ? t('teamDashboard.canEdit')
                                    : t('teamDashboard.cannotEdit')
                                }
                                color={participant.can_edit ? 'success' : 'default'}
                                variant={participant.can_edit ? 'filled' : 'outlined'}
                              />
                              {participant.updated_at ? (
                                <Typography variant="caption" color="text.secondary">
                                  {t('teamDashboard.updatedAt', { value: formatDate(participant.updated_at) })}
                                </Typography>
                              ) : null}
                            </Stack>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title={t('teamDashboard.editMember')}>
                              <IconButton edge="end" onClick={() => openEditParticipantDialog(participant)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('teamDashboard.deleteMember')}>
                              <IconButton edge="end" color="error" onClick={() => setParticipantDeleteTarget(participant)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Stack>
            ) : (
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight="bold">
                      {t('teamDashboard.matchesSection')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('teamDashboard.matchesDescription')}
                    </Typography>
                  </Stack>
                  <Button variant="contained" startIcon={<Add />} onClick={openCreateMatchDialog} sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}>
                    {t('teamDashboard.addMatch')}
                  </Button>
                </Stack>

                {matchesError ? <Alert severity="error">{matchesError}</Alert> : null}

                {matchesLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </Stack>
                ) : matches.length === 0 ? (
                  <Alert severity="info">{t('teamDashboard.noMatches')}</Alert>
                ) : (
                  <Stack spacing={2}>
                    {matches.map((match) => (
                      <Paper
                        key={match.id}
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          borderColor: '#e5e8f0',
                          p: 2,
                        }}
                      >
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {match.opponentTeam || t('teamDashboard.unknownOpponent')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(match.date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('teamDashboard.matchScore', {
                                self: match.selfScore ?? '-',
                                opponent: match.opponentScore ?? '-',
                              })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('teamDashboard.matchPlayer', {
                                player: match.player || t('teamDashboard.noPlayer'),
                                deck: match.deck || t('teamDashboard.noDeck'),
                              })}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <Tooltip title={t('teamDashboard.editMatch')}>
                              <IconButton onClick={() => openEditMatchDialog(match)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('teamDashboard.deleteMatch')}>
                              <IconButton color="error" onClick={() => setMatchDeleteTarget(match)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        </Paper>
      </Box>

      {participantDialog.open ? (
        <Dialog open onClose={participantDialog.submitting ? undefined : handleParticipantDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {participantDialog.mode === 'create'
              ? t('teamDashboard.addMember')
              : t('teamDashboard.editMember')}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {participantDialog.error ? <Alert severity="error">{participantDialog.error}</Alert> : null}
              <TextField
                label={t('teamDashboard.memberNameLabel')}
                value={participantDialog.draft.name}
                onChange={(event) => handleParticipantDraftChange('name', event.target.value)}
                fullWidth
                disabled={participantDialog.submitting}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={participantDialog.draft.can_edit}
                    onChange={(event) => handleParticipantDraftChange('can_edit', event.target.checked)}
                    color="primary"
                    disabled={participantDialog.submitting}
                  />
                }
                label={t('teamDashboard.memberCanEditLabel')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleParticipantDialogClose} disabled={participantDialog.submitting}>
              {t('teamDashboard.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleParticipantSubmit}
              disabled={participantDialog.submitting}
            >
              {participantDialog.submitting ? t('teamDashboard.saving') : t('teamDashboard.save')}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {participantDeleteTarget ? (
        <Dialog open onClose={participantDeleteSubmitting ? undefined : () => setParticipantDeleteTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('teamDashboard.deleteMember')}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {participantDeleteError ? <Alert severity="error">{participantDeleteError}</Alert> : null}
              <Typography>
                {t('teamDashboard.confirmDeleteMember', { name: participantDeleteTarget.name })}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setParticipantDeleteTarget(null)} disabled={participantDeleteSubmitting}>
              {t('teamDashboard.cancel')}
            </Button>
            <Button
              onClick={handleParticipantDelete}
              color="error"
              variant="contained"
              disabled={participantDeleteSubmitting}
            >
              {participantDeleteSubmitting ? t('teamDashboard.deleting') : t('teamDashboard.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {matchDialog.open ? (
        <Dialog open onClose={matchDialog.submitting ? undefined : handleMatchDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {matchDialog.mode === 'create' ? t('teamDashboard.addMatch') : t('teamDashboard.editMatch')}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {matchDialog.error ? <Alert severity="error">{matchDialog.error}</Alert> : null}
              <TextField
                label={t('teamDashboard.matchPlayerLabel')}
                value={matchDialog.draft.player}
                onChange={(event) => handleMatchDraftChange('player', event.target.value)}
                fullWidth
                disabled={matchDialog.submitting}
              />
              <TextField
                label={t('teamDashboard.matchDeckLabel')}
                value={matchDialog.draft.deck}
                onChange={(event) => handleMatchDraftChange('deck', event.target.value)}
                fullWidth
                disabled={matchDialog.submitting}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('teamDashboard.selfScoreLabel')}
                  value={matchDialog.draft.selfScore}
                  onChange={(event) => handleMatchDraftChange('selfScore', event.target.value)}
                  fullWidth
                  disabled={matchDialog.submitting}
                />
                <TextField
                  label={t('teamDashboard.opponentScoreLabel')}
                  value={matchDialog.draft.opponentScore}
                  onChange={(event) => handleMatchDraftChange('opponentScore', event.target.value)}
                  fullWidth
                  disabled={matchDialog.submitting}
                />
              </Stack>
              <TextField
                label={t('teamDashboard.opponentTeamLabel')}
                value={matchDialog.draft.opponentTeam}
                onChange={(event) => handleMatchDraftChange('opponentTeam', event.target.value)}
                fullWidth
                disabled={matchDialog.submitting}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('teamDashboard.opponentPlayerLabel')}
                  value={matchDialog.draft.opponentPlayer}
                  onChange={(event) => handleMatchDraftChange('opponentPlayer', event.target.value)}
                  fullWidth
                  disabled={matchDialog.submitting}
                />
                <TextField
                  label={t('teamDashboard.opponentDeckLabel')}
                  value={matchDialog.draft.opponentDeck}
                  onChange={(event) => handleMatchDraftChange('opponentDeck', event.target.value)}
                  fullWidth
                  disabled={matchDialog.submitting}
                />
              </Stack>
              <TextField
                label={t('teamDashboard.matchDateLabel')}
                type="date"
                value={matchDialog.draft.date}
                onChange={(event) => handleMatchDraftChange('date', event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={matchDialog.submitting}
              />
              <TextField
                label={t('teamDashboard.tournamentIdLabel')}
                value={matchDialog.draft.tournamentId}
                onChange={(event) => handleMatchDraftChange('tournamentId', event.target.value)}
                fullWidth
                helperText={t('teamDashboard.tournamentIdHelper')}
                disabled={matchDialog.submitting}
              />
              <TextField
                label={t('teamDashboard.roundIdLabel')}
                value={matchDialog.draft.roundId}
                onChange={(event) => handleMatchDraftChange('roundId', event.target.value)}
                fullWidth
                helperText={t('teamDashboard.roundIdHelper')}
                disabled={matchDialog.submitting}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleMatchDialogClose} disabled={matchDialog.submitting}>
              {t('teamDashboard.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleMatchSubmit}
              disabled={matchDialog.submitting}
            >
              {matchDialog.submitting ? t('teamDashboard.saving') : t('teamDashboard.save')}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {matchDeleteTarget ? (
        <Dialog open onClose={matchDeleteSubmitting ? undefined : () => setMatchDeleteTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('teamDashboard.deleteMatch')}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {matchDeleteError ? <Alert severity="error">{matchDeleteError}</Alert> : null}
              <Typography>
                {t('teamDashboard.confirmDeleteMatch', {
                  opponent: matchDeleteTarget.opponentTeam || t('teamDashboard.unknownOpponent'),
                })}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMatchDeleteTarget(null)} disabled={matchDeleteSubmitting}>
              {t('teamDashboard.cancel')}
            </Button>
            <Button
              onClick={handleMatchDelete}
              color="error"
              variant="contained"
              disabled={matchDeleteSubmitting}
            >
              {matchDeleteSubmitting ? t('teamDashboard.deleting') : t('teamDashboard.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
};

export default TeamDashboard;
