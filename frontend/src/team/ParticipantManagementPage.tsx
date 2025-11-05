import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Paper } from '@mui/material';
import { Edit, Delete, PersonAdd } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTranslation } from 'react-i18next';

interface Participant {
  id: string;
  team_id: string;
  name: string;
  can_edit: boolean;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

const ParticipantManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // For moving participants
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participantName, setParticipantName] = useState('');
  // チーム側では編集権限の付与は不可（管理者のみ）
  const [newTeamId, setNewTeamId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const authFetch = useAuthorizedFetch();

  const fetchTeamDetails = useCallback(async () => {
    try {
      const response = await authFetch(`/api/team/me`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchTeamError'));
      }
      setTeamName(data.name);
    } catch (err: any) {
      console.error('Failed to fetch team details:', err);
      setError(err.message || t('participantManagement.fetchTeamError'));
    }
  }, [authFetch, t]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/team/participants`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchError'));
      }
      setParticipants(data);
    } catch (err: any) {
      console.error('Failed to fetch participants:', err);
      setError(err.message || t('participantManagement.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, t]);

  const fetchTeamsForMove = useCallback(async () => {
    // fetch teams using supabase auth
    try {
      const response = await authFetch('/api/teams');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchTeamsForMoveError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams for move:', err);
    }
  }, [authFetch, t]);

  useEffect(() => {
    fetchTeamDetails();
    fetchParticipants();
    fetchTeamsForMove();
  }, [fetchTeamDetails, fetchParticipants, fetchTeamsForMove]);

  const handleOpenCreateDialog = () => {
    setCurrentParticipant(null);
    setParticipantName('');
    // can_edit は常に付与不可
    setNewTeamId(teamId || null);
    setDialogError(null);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (participant: Participant) => {
    setCurrentParticipant(participant);
    setParticipantName(participant.name);
    // can_edit は表示のみで編集不可
    setNewTeamId(participant.team_id);
    setDialogError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveParticipant = async () => {
    setDialogError(null);
    if (!participantName) {
      setDialogError(t('participantManagement.nameRequired'));
      return;
    }
    if (!teamId) {
      setDialogError(t('participantManagement.teamIdMissing'));
      return;
    }

    setLoading(true);
    try {
      const method = currentParticipant ? 'PUT' : 'POST';
      const url = currentParticipant
        ? `/api/team/participants/${currentParticipant.id}`
        : `/api/team/participants`;
      // can_edit はチーム側から変更不可
      const body: any = { name: participantName };
      if (currentParticipant && newTeamId && newTeamId !== currentParticipant.team_id) {
        body.team_id = newTeamId;
      }

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.saveError'));
      }

      fetchParticipants();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Failed to save participant:', err);
      setDialogError(err.message || t('participantManagement.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!window.confirm(t('participantManagement.confirmDelete'))) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/team/participants/${participantId}`, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('participantManagement.deleteError'));
      }

      fetchParticipants();
    } catch (err: any) {
      console.error('Failed to delete participant:', err);
      setError(err.message || t('participantManagement.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !participants.length && !teamName) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {teamName ? t('participantManagement.titleForTeam', { teamName }) : t('participantManagement.title')}
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={handleOpenCreateDialog}>
          {t('participantManagement.addParticipant')}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {participants.length === 0 && !loading ? (
        <Alert severity="info">{t('participantManagement.noParticipants')}</Alert>
      ) : (
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          <List>
            {participants.map((participant) => (
              <ListItem key={participant.id} divider>
                <ListItemText
                  primary={participant.name}
                  secondary={participant.can_edit ? t('participantManagement.canEdit') : t('participantManagement.cannotEdit')}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(participant)}>
                    <Edit />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteParticipant(participant.id)}>
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{currentParticipant ? t('participantManagement.editParticipant') : t('participantManagement.addParticipant')}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('participantManagement.participantName')}
              fullWidth
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              required
            />
            {/* 編集権限の付与はチーム側では不可（管理者機能） */}
            {currentParticipant && (
              <TextField
                select
                label={t('participantManagement.moveToTeam')}
                fullWidth
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value as string)}
                SelectProps={{
                  native: true,
                }}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveParticipant} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantManagementPage;
