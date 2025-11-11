import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { CloudDownload, CloudUpload, Delete, Description, Edit, EditOff, GroupAdd, PersonAdd, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useRef } from 'react';
import Papa from 'papaparse';

interface Team {
  id: string;
  name: string;
  username: string;
  created_at: string;
}

interface Participant {
  id: string;
  name: string;
  created_at: string;
  team_id?: string;
}

interface Tournament {
  id: string;
  slug: string;
  name: string;
}

type TeamManagementPageProps = {
  embedded?: boolean;
  tournament?: Tournament;
};

const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ embedded = false, tournament }) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const tournamentId = tournament?.id ?? null;
  const tournamentSlug = tournament?.slug ?? null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamDialogError, setTeamDialogError] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamUsername, setTeamUsername] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState<boolean>(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [participantDialogError, setParticipantDialogError] = useState<string | null>(null);
  const [participantSubmitting, setParticipantSubmitting] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participantName, setParticipantName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const missingTournamentContext = !tournamentId || !tournamentSlug;

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const authHeader = useMemo(() => {
    if (!session?.access_token) {
      return null;
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session]);

  const fetchTeams = useCallback(async () => {
    if (!authHeader) {
      setTeamsLoading(false);
      setTeamsError(t('teamManagement.fetchError'));
      return;
    }
    if (!tournamentId) {
      setTeamsLoading(false);
      setTeamsError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournamentId);
      const response = await fetch(`/api/teams?${params.toString()}`, {
        headers: authHeader,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('teamManagement.fetchError'));
      }
      setTeams(data);
      setSelectedTeamId((prev) => {
        if (prev && data.some((team: Team) => team.id === prev)) {
          return prev;
        }
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setTeamsError(err.message || t('teamManagement.fetchError'));
    } finally {
      setTeamsLoading(false);
    }
  }, [authHeader, t, tournamentId]);

  const fetchParticipants = useCallback(
    async (teamId: string) => {
      if (!authHeader) {
        setParticipants([]);
        setParticipantsError(t('participantManagement.fetchError'));
        return;
      }
      setParticipantsLoading(true);
      setParticipantsError(null);
      try {
        const response = await fetch(`/api/admin/teams/${teamId}/participants`, {
          headers: authHeader,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || t('participantManagement.fetchError'));
        }
        setParticipants(data);
      } catch (err: any) {
        console.error('Failed to fetch participants:', err);
        setParticipantsError(err.message || t('participantManagement.fetchError'));
        setParticipants([]);
      } finally {
        setParticipantsLoading(false);
      }
    },
    [authHeader, t],
  );

  const handleExportTeams = useCallback(async () => {
    if (!authHeader) {
      setExportError(t('teamManagement.exportError'));
      return;
    }
    if (!tournamentId) {
      setExportError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    setExportError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournamentId);
      const response = await fetch(`/api/teams/export?${params.toString()}`, {
        headers: authHeader,
      });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || t('teamManagement.exportError'));
            }
      
            const csvText = await response.text();
            const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'teams_and_participants.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);    } catch (err: any) {
      console.error('Failed to export teams:', err);
      setExportError(err.message || t('teamManagement.exportError'));
    }
  }, [authHeader, t, tournamentId]);

  const handleDownloadTemplate = useCallback(() => {
    const template = [
      ['team_name', 'participant_name'],
      [t('teamManagement.sampleTeamA'), t('teamManagement.samplePlayerTanaka')],
      [t('teamManagement.sampleTeamA'), t('teamManagement.samplePlayerSuzuki')],
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_participant_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, [t]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!authHeader) {
      setImportError(t('teamManagement.importError'));
      return;
    }
    if (!tournamentSlug) {
      setImportError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setTeamSubmitting(true); // Use teamSubmitting to disable buttons during import

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tournament_slug', tournamentSlug);

    try {
      const response = await fetch('/api/teams/import', {
        method: 'POST',
        headers: {
          ...authHeader,
          // 'Content-Type': 'multipart/form-data' はfetchが自動で設定するため不要
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('teamManagement.importError'));
      }

      setImportSuccess(t('teamManagement.importSuccess', { teams: data.teamsCreatedCount, participants: data.participantsCreatedCount }));
      await fetchTeams(); // Refresh team list after import
    } catch (err: any) {
      console.error('Failed to import teams:', err);
      setImportError(err.message || t('teamManagement.importError'));
    } finally {
      setTeamSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear file input
      }
    }
  }, [authHeader, fetchTeams, t, tournamentSlug]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchParticipants(selectedTeamId);
    } else {
      setParticipants([]);
    }
  }, [fetchParticipants, selectedTeamId]);

  const handleOpenCreateTeam = () => {
    setCurrentTeam(null);
    setTeamName('');
    setTeamDialogError(null);
    setTeamDialogOpen(true);
    setGeneratedPassword(null);
  };

  const handleOpenEditTeam = (team: Team) => {
    setCurrentTeam(team);
    setTeamName(team.name);
    setTeamUsername(team.username);
    setTeamPassword('');
    setTeamDialogError(null);
    setTeamDialogOpen(true);
    setGeneratedPassword(null);
  };

  const handleCloseTeamDialog = () => {
    if (teamSubmitting) return;
    setTeamDialogOpen(false);
    setGeneratedPassword(null);
    setShowPassword(false);
    setCopySuccess(false);
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSaveTeam = async () => {
    setTeamDialogError(null);
    if (!authHeader) {
      setTeamDialogError(t('teamManagement.saveError'));
      return;
    }

    const method = currentTeam ? 'PUT' : 'POST';
    const url = currentTeam ? `/api/teams/${currentTeam.id}` : '/api/teams/register';
    let body: Record<string, unknown>;

    if (currentTeam) { // Edit mode
      if (!teamName.trim() || !teamUsername.trim()) {
        setTeamDialogError(t('teamManagement.allFieldsRequired'));
        return;
      }
      body = {
        name: teamName.trim(),
        username: teamUsername.trim(),
      };
      if (tournamentSlug) {
        body.tournament_slug = tournamentSlug;
      }
      if (teamPassword) {
        body.password = teamPassword;
      }
    } else { // Create mode
      if (!teamName.trim()) {
        setTeamDialogError(t('teamManagement.teamNameRequired'));
        return;
      }
      if (!tournamentSlug) {
        setTeamDialogError(t('teamManagement.tournamentSlugRequired'));
        return;
      }
      body = {
        name: teamName.trim(),
        tournament_slug: tournamentSlug,
      };
    }

    setTeamSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('teamManagement.saveError'));
      }

      if (!currentTeam && data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        setTeamDialogOpen(false);
      }

      await fetchTeams();
    } catch (err: any) {
      console.error('Failed to save team:', err);
      setTeamDialogError(err.message || t('teamManagement.saveError'));
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!authHeader) {
      setTeamsError(t('teamManagement.deleteError'));
      return;
    }
    if (!window.confirm(t('teamManagement.confirmDelete'))) {
      return;
    }
    setTeamSubmitting(true);
    setTeamsError(null);
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: authHeader,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('teamManagement.deleteError'));
      }

      await fetchTeams();
      setSelectedTeamId((prev) => (prev === teamId ? null : prev));
    } catch (err: any) {
      console.error('Failed to delete team:', err);
      setTeamsError(err.message || t('teamManagement.deleteError'));
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleOpenParticipantDialog = (participant?: Participant) => {
    if (!selectedTeam) {
      setParticipantsError(t('participantManagement.teamIdMissing'));
      return;
    }
    setCurrentParticipant(participant ?? null);
    setParticipantName(participant?.name ?? '');
    setParticipantDialogError(null);
    setParticipantDialogOpen(true);
  };

  const handleCloseParticipantDialog = () => {
    if (participantSubmitting) return;
    setParticipantDialogOpen(false);
  };

  const handleSaveParticipant = async () => {
    if (!selectedTeam) {
      setParticipantDialogError(t('participantManagement.teamIdMissing'));
      return;
    }
    if (!participantName) {
      setParticipantDialogError(t('participantManagement.nameRequired'));
      return;
    }
    if (!authHeader) {
      setParticipantDialogError(t('participantManagement.saveError'));
      return;
    }
    setParticipantSubmitting(true);
    try {
      const method = currentParticipant ? 'PUT' : 'POST';
      const url = currentParticipant
        ? `/api/admin/participants/${currentParticipant.id}`
        : `/api/admin/teams/${selectedTeam.id}/participants`;
      const payload: Record<string, unknown> = {
        name: participantName,
      };
      if (currentParticipant) {
        payload.team_id = selectedTeam.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.saveError'));
      }

      await fetchParticipants(selectedTeam.id);
      setParticipantDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to save participant:', err);
      setParticipantDialogError(err.message || t('participantManagement.saveError'));
    } finally {
      setParticipantSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!selectedTeam) {
      setParticipantsError(t('participantManagement.teamIdMissing'));
      return;
    }
    if (!authHeader) {
      setParticipantsError(t('participantManagement.deleteError'));
      return;
    }
    if (!window.confirm(t('participantManagement.confirmDelete'))) {
      return;
    }
    setParticipantSubmitting(true);
    setParticipantsError(null);
    try {
      const response = await fetch(`/api/admin/participants/${participantId}`, {
        method: 'DELETE',
        headers: authHeader,
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || t('participantManagement.deleteError'));
      }

      await fetchParticipants(selectedTeam.id);
    } catch (err: any) {
      console.error('Failed to delete participant:', err);
      setParticipantsError(err.message || t('participantManagement.deleteError'));
    } finally {
      setParticipantSubmitting(false);
    }
  };

  if (teamsLoading && teams.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: embedded ? 360 : '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        p: embedded ? 0 : { xs: 2, md: 4 },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack spacing={0.5}>
          <Typography variant={embedded ? 'h5' : 'h4'} component="h1" fontWeight="bold">
            {t('teamManagement.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('participantManagement.title')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleExportTeams}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('teamManagement.exportTeams')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Description />}
            onClick={handleDownloadTemplate}
            disabled={teamSubmitting}
          >
            {t('teamManagement.downloadTemplate')}
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={handleImportClick}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('teamManagement.importTeams')}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTeams}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<GroupAdd />}
            onClick={handleOpenCreateTeam}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('teamManagement.createTeam')}
          </Button>
        </Stack>
      </Stack>

      {missingTournamentContext ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('teamManagement.tournamentSlugRequired')}
        </Alert>
      ) : null}

      {importError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {importError}
        </Alert>
      ) : null}
      {importSuccess ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {importSuccess}
        </Alert>
      ) : null}
      {exportError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {exportError}
        </Alert>
      ) : null}

      {teamsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {teamsError}
        </Alert>
      ) : null}

      {teams.length === 0 ? (
        <Alert severity="info">{t('teamManagement.noTeams')}</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.45fr) minmax(0, 1fr)' },
            gap: embedded ? 2 : 3,
          }}
        >
          <Paper
            elevation={embedded ? 0 : 2}
            sx={{
              borderRadius: 2,
              border: embedded ? '1px dashed rgba(24, 32, 56, 0.18)' : undefined,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(24,32,56,0.08)' }}
            >
              <Typography fontWeight={700}>{t('teamManagement.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('common.total')}: {teams.length}
              </Typography>
            </Stack>
            <List disablePadding>
              {teams.map((team) => (
                <ListItem
                  key={team.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleOpenEditTeam(team)}
                        disabled={teamSubmitting}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteTeam(team.id)}
                        disabled={teamSubmitting}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemButton
                    selected={team.id === selectedTeamId}
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    <ListItemText
                      primary={
                        <Typography fontWeight={700} color="text.primary">
                          {team.name}
                        </Typography>
                      }
                      secondary={`@${team.username}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
          <Paper
            elevation={embedded ? 0 : 2}
            sx={{
              borderRadius: 2,
              border: embedded ? '1px dashed rgba(24, 32, 56, 0.18)' : undefined,
              minHeight: 320,
            }}
          >
            <Stack
              spacing={2}
              sx={{
                px: 3,
                py: 2,
                borderBottom: '1px solid rgba(24,32,56,0.08)',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>
                  {selectedTeam
                    ? t('participantManagement.titleForTeam', { teamName: selectedTeam.name })
                    : t('participantManagement.title')}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonAdd />}
                  onClick={() => handleOpenParticipantDialog()}
                  disabled={!selectedTeam || participantSubmitting}
                >
                  {t('participantManagement.addParticipant')}
                </Button>
              </Stack>
              {participantsError ? (
                <Alert severity="error">{participantsError}</Alert>
              ) : null}
              {!selectedTeam ? (
                <Alert severity="info">{t('teamManagement.noTeams')}</Alert>
              ) : participantsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : participants.length === 0 ? (
                <Alert severity="info">{t('participantManagement.noParticipants')}</Alert>
              ) : (
                <List disablePadding>
                  {participants.map((participant) => (
                    <ListItem
                      key={participant.id}
                      divider
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label="edit"
                            onClick={() => handleOpenParticipantDialog(participant)}
                            disabled={participantSubmitting}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteParticipant(participant.id)}
                            disabled={participantSubmitting}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography fontWeight={600} color="text.primary">
                            {participant.name}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          </Paper>
        </Box>
      )}

      <Dialog open={teamDialogOpen} onClose={handleCloseTeamDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {currentTeam ? t('teamManagement.editTeam') : t('teamManagement.createTeam')}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {teamDialogError ? <Alert severity="error">{teamDialogError}</Alert> : null}
            <TextField
              label={t('teamManagement.teamName')}
              fullWidth
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              required
              disabled={teamSubmitting || !!generatedPassword}
            />
            {currentTeam && (
              <>
                <TextField
                  label={t('teamManagement.username')}
                  fullWidth
                  value={teamUsername}
                  onChange={(event) => setTeamUsername(event.target.value)}
                  required
                  disabled={teamSubmitting}
                />
                <TextField
                  label={t('teamManagement.password')}
                  type="password"
                  fullWidth
                  value={teamPassword}
                  onChange={(event) => setTeamPassword(event.target.value)}
                  disabled={teamSubmitting}
                  helperText={t('teamManagement.leaveBlankForNoChange')}
                />
              </>
            )}
            {generatedPassword && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('teamManagement.generatedPassword')}
                </Typography>
                <TextField
                  fullWidth
                  value={generatedPassword}
                  type={showPassword ? 'text' : 'password'}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={handleCopyPassword}
                          disabled={teamSubmitting}
                          size="small"
                          variant="outlined"
                        >
                          {t('common.copy')}
                        </Button>
                        <Button
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={teamSubmitting}
                          size="small"
                          variant="outlined"
                        >
                          {showPassword ? t('common.hide') : t('common.show')}
                        </Button>
                      </Stack>
                    ),
                  }}
                />
                {copySuccess && <Alert severity="success" sx={{ py: 0.5, px: 1, '& .MuiAlert-icon': { fontSize: 18 }, '& .MuiAlert-message': { fontSize: 13 } }}>{t('teamManagement.copySuccess')}</Alert>}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTeamDialog} disabled={teamSubmitting}>
            {t('common.cancel')}
          </Button>
          {generatedPassword ? (
            <Button onClick={handleCloseTeamDialog} variant="contained" disabled={teamSubmitting}>
              {t('common.close')}
            </Button>
          ) : (
            <Button onClick={handleSaveTeam} variant="contained" disabled={teamSubmitting}>
              {t('common.save')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={participantDialogOpen}
        onClose={handleCloseParticipantDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {currentParticipant
            ? t('participantManagement.editParticipant')
            : t('participantManagement.addParticipant')}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {participantDialogError ? <Alert severity="error">{participantDialogError}</Alert> : null}
            <TextField
              label={t('participantManagement.participantName')}
              fullWidth
              value={participantName}
              onChange={(event) => setParticipantName(event.target.value)}
              required
              disabled={participantSubmitting}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={participantCanEdit}
                  onChange={(event) => setParticipantCanEdit(event.target.checked)}
                  disabled={participantSubmitting}
                />
              }
              label={t('participantManagement.grantEditPermission')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseParticipantDialog} disabled={participantSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSaveParticipant} variant="contained" disabled={participantSubmitting}>
            {currentParticipant ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagementPage;
