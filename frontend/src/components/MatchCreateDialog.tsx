import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  MenuItem,
}
from '@mui/material';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTranslation } from 'react-i18next';

type MatchRecord = {
  id: string;
  team?: string | null;
  player?: string | null;
  deck?: string | null;
  selfScore?: string | null;
  opponentScore?: string | null;
  opponentTeam?: string | null;
  opponentPlayer?: string | null;
  opponentDeck?: string | null;
  date?: string | null;
  created_at?: string | null;
  tournament_id?: string | null;
  round_id?: string | null;
};

type MatchFormValues = {
  teamId: string | null;
  opponentTeamId: string | null;
  date: string;
};

interface Team {
  id: string;
  name: string;
}

const createInitialValues = (): MatchFormValues => ({
  teamId: null,
  opponentTeamId: null,
  date: '',
});

type MatchCreateDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  match: MatchRecord | null;
  onClose: () => void;
  onCompleted: (mode: 'create' | 'edit') => void;
  tournamentId: string;
  roundId: string | null;
};

const MatchCreateDialog: React.FC<MatchCreateDialogProps> = ({
  open,
  mode,
  match,
  onClose,
  onCompleted,
  tournamentId,
  roundId,
}) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MatchFormValues>(createInitialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const authFetch = useAuthorizedFetch();

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const response = await authFetch('/api/teams');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('matchCreateDialog.fetchTeamsError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setError(err.message || t('matchCreateDialog.fetchTeamsError'));
    } finally {
      setTeamsLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    if (open) {
      fetchTeams();
      if (mode === 'edit' && match) {
        setValues({
          teamId: match.team ?? null,
          opponentTeamId: match.opponentTeam ?? null,
          date: match.date ? match.date.slice(0, 10) : '',
        });
      } else {
        setValues(createInitialValues());
      }
      setError(null);
    }
  }, [open, mode, match, fetchTeams]);

  const handleChange =
    (field: keyof MatchFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSubmit = async () => {
    const targetRoundId = effectiveRoundId;
    if (!targetRoundId) {
      setError(t('matchCreateDialog.roundNotSelected'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        team: values.teamId,
        opponentTeam: values.opponentTeamId,
        date: values.date ? values.date : null,
        tournamentId,
        roundId: targetRoundId,
      };

      if (mode === 'edit' && match) {
        const response = await authFetch(`/api/matches/${match.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        await response.json();
        onCompleted('edit');
      } else {
        const response = await authFetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        await response.json();
        onCompleted('create');
      }
    } catch (err) {
      console.error('Error creating match:', err);
      setError(
        err instanceof Error
          ? err.message
          : mode === 'edit'
          ? t('matchCreateDialog.updateFailed')
          : t('matchCreateDialog.createFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveRoundId = roundId ?? match?.round_id ?? null;
  const hasRoundContext = Boolean(effectiveRoundId);
  const isSubmitDisabled =
    submitting || teamsLoading || !hasRoundContext || values.teamId === '' || values.opponentTeamId === '';

  const dialogTitle = mode === 'edit' ? t('matchCreateDialog.editMatch') : t('matchCreateDialog.createMatch');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          {teamsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : teams.length === 0 ? (
            <Alert severity="warning">{t('matchCreateDialog.noTeamsRegistered')}</Alert>
          ) : (
            <>
              {mode === 'create' ? (
                <Typography sx={{ fontSize: 13, color: '#6a7184' }}>
                  {t('matchCreateDialog.createMatchDescription')}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 13, color: '#6a7184' }}>
                  {t('matchCreateDialog.editMatchDescription')}
                </Typography>
              )}
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <TextField
                  select
                  label={t('matchCreateDialog.homeTeam')}
                  value={values.teamId || ''}
                  onChange={handleChange('teamId')}
                  fullWidth
                  required
                >
                  <MenuItem value="" disabled>
                    <em>{t('matchCreateDialog.selectTeam')}</em>
                  </MenuItem>
                  {teams.filter(team => team.id !== values.opponentTeamId).map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={t('matchCreateDialog.awayTeam')}
                  value={values.opponentTeamId || ''}
                  onChange={handleChange('opponentTeamId')}
                  fullWidth
                  required
                >
                  <MenuItem value="" disabled>
                    <em>{t('matchCreateDialog.selectTeam')}</em>
                  </MenuItem>
                  {teams.filter(team => team.id !== values.teamId).map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('matchCreateDialog.matchDate')}
                  type="date"
                  value={values.date}
                  onChange={handleChange('date')}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitDisabled}>
          {submitting
            ? mode === 'edit'
              ? t('common.updating')
              : t('common.creating')
            : mode === 'edit'
            ? t('common.update')
            : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchCreateDialog;
