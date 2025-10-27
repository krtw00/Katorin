import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useAuth } from '../auth/AuthContext';
import TournamentCreateDialog, { Tournament } from './TournamentCreateDialog';
import LanguageSwitcher from '../components/LanguageSwitcher';

type TournamentSelectionProps = {
  onSelect: (tournament: Tournament) => void;
  onCancel?: () => void;
};

const TournamentSelection: React.FC<TournamentSelectionProps> = ({ onSelect, onCancel }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const { signOut } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/tournaments');
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('tournament.selection.errorInvalidResponse'));
      }
      const data: Tournament[] = await response.json();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError(t('tournament.selection.errorFailed'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) => {
        const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (Number.isNaN(dateDiff)) {
          return b.name.localeCompare(a.name, 'ja');
        }
        return dateDiff;
      }),
    [tournaments],
  );

  const handleSelect = (tournament: Tournament) => {
    onSelect(tournament);
  };

  const handleCreated = (tournament: Tournament) => {
    setTournaments((prev) => {
      const exists = prev.some((item) => item.id === tournament.id);
      if (exists) {
        return prev.map((item) => (item.id === tournament.id ? tournament : item));
      }
      return [tournament, ...prev];
    });
    setDialogOpen(false);
    setInfoMessage(t('tournament.selection.created', { name: tournament.name }));
    onSelect(tournament);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f4f6fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 6 },
      }}
    >
      <Paper
        elevation={4}
        sx={{
          maxWidth: 720,
          width: '100%',
          p: { xs: 4, md: 6 },
          borderRadius: 4,
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </Box>
        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
            {t('tournament.selection.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('tournament.selection.subtitle')}
          </Typography>
          {infoMessage ? (
            <Alert severity="success" onClose={() => setInfoMessage(null)}>
              {infoMessage}
            </Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setDialogOpen(true);
                setInfoMessage(null);
              }}
            >
              {t('tournament.selection.createButton')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadTournaments}
              disabled={loading}
            >
              {t('tournament.selection.refreshButton')}
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {onCancel ? (
              <Button variant="text" color="inherit" onClick={onCancel}>
                {t('tournament.selection.backButton')}
              </Button>
            ) : null}
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
            >
              {t('tournament.selection.logoutButton')}
            </Button>
          </Stack>
        </Stack>
        {loading ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              {t('tournament.selection.loading')}
            </Typography>
          </Stack>
        ) : sortedTournaments.length === 0 ? (
          <Alert severity="info" icon={<AddRoundedIcon fontSize="inherit" />}>
            {t('tournament.selection.noTournaments')}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {sortedTournaments.map((tournament) => (
              <Paper
                key={tournament.id}
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  borderColor: '#d3dcff',
                  bgcolor: '#f8faff',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {tournament.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tournament.slug}
                  </Typography>
                  {tournament.description ? (
                    <Typography variant="body2" color="text.secondary">
                      {tournament.description}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.disabled">
                    {t('tournament.selection.createdAt')}{' '}
                    {new Date(tournament.created_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Stack>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => handleSelect(tournament)}
                >
                  {t('tournament.selection.selectButton')}
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
      <TournamentCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
};

export default TournamentSelection;
