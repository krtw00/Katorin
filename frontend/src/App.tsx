import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, CssBaseline, Stack, Typography } from '@mui/material';
import MatchManager from './MatchManager';
import ResultEntry from './ResultEntry';
import LoginForm from './auth/LoginForm';
import { useAuth } from './auth/AuthContext';
import TournamentCreateDialog from './admin/TournamentCreateDialog';

const App: React.FC = () => {
  const [view, setView] = useState<'manager' | 'result'>('manager');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { loading, session, user, signOut } = useAuth();
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [tournamentMessage, setTournamentMessage] = useState<string | null>(null);

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
      ) : session ? (
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
              {isAdmin ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => {
                    setTournamentDialogOpen(true);
                    setTournamentMessage(null);
                  }}
                >
                  大会を作成
                </Button>
              ) : null}
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
            {isAdmin && tournamentMessage ? (
              <Alert
                severity="success"
                onClose={() => setTournamentMessage(null)}
                sx={{ mb: 2 }}
              >
                {tournamentMessage}
              </Alert>
            ) : null}
            {view === 'manager' ? (
              <MatchManager onOpenResultEntry={handleOpenResult} reloadToken={reloadToken} />
            ) : (
              <ResultEntry matchId={selectedMatchId} onBack={handleBackToManager} onSaved={handleResultSaved} />
            )}
          </Box>
        </Stack>
      ) : (
        <LoginForm />
      )}
      <TournamentCreateDialog
        open={tournamentDialogOpen}
        onClose={() => setTournamentDialogOpen(false)}
        onCreated={(tournament) => {
          setTournamentDialogOpen(false);
          setTournamentMessage(`「${tournament.name}」を作成しました。`);
        }}
      />
    </>
  );
};

export default App;
