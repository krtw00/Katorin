import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import TournamentCreateDialog, { Tournament } from './TournamentCreateDialog';

type TournamentSelectionProps = {
  onSelect: (tournament: Tournament) => void;
};

const TournamentSelection: React.FC<TournamentSelectionProps> = ({ onSelect }) => {
  const authFetch = useAuthorizedFetch();
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
        throw new Error('サーバーが不正なレスポンスを返しました。');
      }
      const data: Tournament[] = await response.json();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError('大会一覧の取得に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

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
    setInfoMessage(`「${tournament.name}」を作成しました。`);
    onSelect(tournament);
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
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
            大会を選択
          </Typography>
          <Typography variant="body2" color="text.secondary">
            まずは管理したい大会を選択してください。新しい大会を作成することもできます。
          </Typography>
          {infoMessage ? (
            <Alert severity="success" onClose={() => setInfoMessage(null)}>
              {infoMessage}
            </Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setDialogOpen(true);
              setInfoMessage(null);
            }}
          >
            大会を作成
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={loadTournaments}
            disabled={loading}
          >
            更新
          </Button>
        </Stack>
        {loading ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              大会を読み込み中です…
            </Typography>
          </Stack>
        ) : sortedTournaments.length === 0 ? (
          <Alert severity="info" icon={<AddRoundedIcon fontSize="inherit" />}>
            まだ大会が登録されていません。先に「大会を作成」を押して登録してください。
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
                    作成日時:{' '}
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
                  この大会を管理する
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
