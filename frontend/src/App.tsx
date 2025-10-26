import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, CssBaseline, Stack, Typography } from '@mui/material';
import MatchManager from './MatchManager';
import ResultEntry from './ResultEntry';
import LoginForm from './auth/LoginForm';
import { useAuth } from './auth/AuthContext';
import TournamentSelection from './admin/TournamentSelection';
import TournamentCreateDialog, { Tournament } from './admin/TournamentCreateDialog';

const App: React.FC = () => {
  const [view, setView] = useState<'manager' | 'result'>('manager');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [previousTournament, setPreviousTournament] = useState<Tournament | null>(null);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [tournamentMessage, setTournamentMessage] = useState<string | null>(null);
  const { loading, session, user, signOut } = useAuth();

  const handleOpenResult = (matchId: string) => {
    setSelectedMatchId(matchId);
    setView('result');
  };

  const handleBackToManager = () => {
    setView('manager');
    setSelectedMatchId(null);
  };

  const handleResultSaved = () => {
    setReloadToken((prev) => prev + 1);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (selectedTournament) {
      window.localStorage.setItem('katorin:selectedTournamentId', selectedTournament.id);
      window.localStorage.setItem('katorin:selectedTournamentName', selectedTournament.name);
      window.dispatchEvent(new CustomEvent('katorin:tournamentChanged', { detail: selectedTournament }));
    } else {
      window.localStorage.removeItem('katorin:selectedTournamentId');
      window.localStorage.removeItem('katorin:selectedTournamentName');
      window.dispatchEvent(new CustomEvent('katorin:tournamentCleared'));
    }
  }, [selectedTournament]);

  const handleSignOut = () => {
    signOut().catch((err) => {
      console.error('Sign-out failed:', err);
    });
  };

  const isAdmin = useMemo(() => {
    const primaryRole = user?.app_metadata?.role;
    const roles = user?.app_metadata?.roles;
    const normalized = [
      ...(Array.isArray(roles) ? roles : roles ? [roles] : []),
      primaryRole,
    ]
      .filter(Boolean)
      .map((value) => value.toString().toLowerCase());
    return normalized.includes('admin');
  }, [user]);

  const handleTournamentSelected = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setPreviousTournament(null);
    setTournamentMessage(`「${tournament.name}」を選択しました。`);
  };

  const renderAdminMainView = () => (
    <Stack sx={{ minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          bgcolor: '#1f2937',
          color: '#fff',
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Katorin Match Manager
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {selectedTournament ? (
            <Stack spacing={0.5} alignItems="flex-end">
              <Typography variant="caption" color="#9ca3af">
                選択中の大会
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="#d1d5db">
                {selectedTournament.name}
              </Typography>
            </Stack>
          ) : null}
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={() => {
              setTournamentDialogOpen(true);
              setTournamentMessage(null);
            }}
          >
            大会を作成
          </Button>
          <Button
            variant="text"
            color="inherit"
            size="small"
            onClick={() => {
              setPreviousTournament(selectedTournament);
              setSelectedTournament(null);
              setTournamentMessage(null);
            }}
          >
            大会を変更
          </Button>
          {user?.email ? (
            <Typography variant="body2" color="#d1d5db">
              {user.email}
            </Typography>
          ) : null}
          <Button variant="outlined" color="inherit" size="small" onClick={handleSignOut}>
            ログアウト
          </Button>
        </Stack>
      </Box>
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
        {tournamentMessage ? (
          <Alert severity="success" onClose={() => setTournamentMessage(null)} sx={{ mb: 2 }}>
            {tournamentMessage}
          </Alert>
        ) : null}
        {selectedTournament ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            現在「{selectedTournament.name}」を管理しています。
          </Alert>
        ) : null}
        {view === 'manager' ? (
          <MatchManager
            tournament={selectedTournament}
            onOpenResultEntry={handleOpenResult}
            reloadToken={reloadToken}
          />
        ) : (
          <ResultEntry
            tournament={selectedTournament}
            matchId={selectedMatchId}
            onBack={handleBackToManager}
            onSaved={handleResultSaved}
          />
        )}
      </Box>
    </Stack>
  );

  const renderParticipantPlaceholder = () => (
    <Stack sx={{ minHeight: '100vh', bgcolor: '#f4f6fb', alignItems: 'center', justifyContent: 'center', p: 4 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h5" fontWeight="bold">
          参加者用画面は準備中です
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
          現在は運営アカウントのみ管理ツールをご利用いただけます。参加者向けの機能は今後追加予定です。
        </Typography>
        <Button variant="outlined" onClick={handleSignOut}>
          ログアウト
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <>
      <CssBaseline />
      {loading ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f4f6fb',
          }}
        >
          <CircularProgress />
        </Box>
      ) : !session ? (
        <LoginForm />
      ) : isAdmin ? (
        selectedTournament ? (
          renderAdminMainView()
        ) : (
          <TournamentSelection
            onSelect={handleTournamentSelected}
            onCancel={
              previousTournament
                ? () => {
                    setSelectedTournament(previousTournament);
                    setPreviousTournament(null);
                  }
                : undefined
            }
          />
        )
      ) : (
        renderParticipantPlaceholder()
      )}
      {isAdmin ? (
        <TournamentCreateDialog
          open={tournamentDialogOpen}
          onClose={() => setTournamentDialogOpen(false)}
          onCreated={(tournament) => {
            setTournamentDialogOpen(false);
            setSelectedTournament(tournament);
            setPreviousTournament(null);
            setTournamentMessage(`「${tournament.name}」を作成しました。`);
          }}
        />
      ) : null}
    </>
  );
};

export default App;
