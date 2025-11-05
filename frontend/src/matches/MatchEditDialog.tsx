import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTeamApi } from '../team/useTeamApi';
import type { MatchRecord } from '../types/matchTypes';

type Participant = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  match: MatchRecord | null;
  participants: Participant[];
  onClose: () => void;
  onUpdated: (match: MatchRecord) => void;
};

const ensureDateInputValue = (value?: string | null) => {
  if (!value) return '';
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toISODateString = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }
  const withTime = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(withTime.getTime()) ? null : withTime.toISOString();
};

const MatchEditDialog: React.FC<Props> = ({ open, match, participants, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();
  const [playerName, setPlayerName] = useState('');
  const [playerInput, setPlayerInput] = useState('');
  const [selfScore, setSelfScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [opponentPlayer, setOpponentPlayer] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timezone, setTimezone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) {
      setPlayerName('');
      setPlayerInput('');
      setSelfScore('');
      setOpponentScore('');
      setOpponentTeam('');
      setOpponentPlayer('');
      setDateValue('');
      setTimezone('');
      setError(null);
      return;
    }
    setPlayerName(match.player ?? '');
    setPlayerInput(match.player ?? '');
    setSelfScore(match.selfScore ?? '');
    setOpponentScore(match.opponentScore ?? '');
    setOpponentTeam(match.opponentTeam ?? '');
    setOpponentPlayer(match.opponentPlayer ?? '');
    setDateValue(ensureDateInputValue(match.date));
    setTimezone(match.timezone ?? '');
    setError(null);
  }, [open, match]);

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.name === playerName) ?? null,
    [participants, playerName],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!match) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        player: playerName,
        selfScore,
        opponentScore,
        opponentTeam,
        opponentPlayer,
      };
      const isoDate = toISODateString(dateValue);
      if (isoDate) {
        body.date = isoDate;
      }
      if (timezone) {
        body.timezone = timezone;
      }
      const response = await teamApi(`/api/team/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = (await response.text()) || t('matchManager.teamUpdateFailed');
        throw new Error(message);
      }
      const updatedMatch: MatchRecord = await response.json();
      onUpdated(updatedMatch);
      onClose();
    } catch (e: any) {
      setError(e?.message || t('matchManager.teamUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('matchManager.teamEditTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Autocomplete
              options={participants}
              getOptionLabel={(option) => option.name}
              value={selectedParticipant}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('matchManager.teamDateLabel')}
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={t('matchManager.teamTimezoneLabel')}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            {t('matchManager.teamCancel')}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('matchManager.teamSaving') : t('matchManager.teamSave')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MatchEditDialog;
