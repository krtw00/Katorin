import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Paper, Checkbox, FormControlLabel } from '@mui/material';
import { Edit, Delete, PersonAdd, ArrowForward } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // For moving participants
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [newTeamId, setNewTeamId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const teamToken = localStorage.getItem('team_jwt_token');

  const fetchTeamDetails = useCallback(async () => {
    if (!teamId || !teamToken) return;
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: {
          Authorization: `Bearer ${teamToken}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchTeamError'));
      }
      setTeamName(data.name);
    } catch (err: any) {
      console.error('Failed to fetch team details:', err);
      setError(err.message || t('participantManagement.fetchTeamError'));
    }
  }, [teamId, teamToken, t]);

  const fetchParticipants = useCallback(async () => {
    if (!teamId || !teamToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${teamId}/participants`, {
        headers: {
          Authorization: `Bearer ${teamToken}`,
        },
      });
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
  }, [teamId, teamToken, t]);

  const fetchTeamsForMove = useCallback(async () => {
    const adminToken = localStorage.getItem('sb:token'); // Assuming admin token is stored here
    if (!adminToken) return;
    try {
      const response = await fetch('/api/teams', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchTeamsForMoveError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams for move:', err);
    }
  }, [t]);

  useEffect(() => {
    fetchTeamDetails();
    fetchParticipants();
    fetchTeamsForMove();
  }, [fetchTeamDetails, fetchParticipants, fetchTeamsForMove]);

  const handleOpenCreateDialog = () => {
    setCurrentParticipant(null);
    setParticipantName('');
    setCanEdit(false);
    setNewTeamId(teamId || null);
    setDialogError(null);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (participant: Participant) => {
    setCurrentParticipant(participant);
    setParticipantName(participant.name);
    setCanEdit(participant.can_edit);
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
      const url = currentParticipant ? `/api/participants/${currentParticipant.id}` : `/api/teams/${teamId}/participants`;
      const body: any = { name: participantName, can_edit: canEdit };
      if (currentParticipant && newTeamId && newTeamId !== currentParticipant.team_id) {
        body.team_id = newTeamId;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teamToken}`,
        },
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
      const response = await fetch(`/api/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${teamToken}`,
        },
      });

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
            <FormControlLabel
              control={<Checkbox checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />}
              label={t('participantManagement.grantEditPermission')}
            />
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
