import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, CssBaseline, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MatchManager from './MatchManager';
import ResultEntry from './ResultEntry';
import LoginForm from './auth/LoginForm';
import { useAuth } from './auth/AuthContext';
import TournamentSelection from './admin/TournamentSelection';
import TournamentCreateDialog, { Tournament } from './admin/TournamentCreateDialog';
import PasswordResetForm from './auth/PasswordResetForm';
import LanguageSwitcher from './components/LanguageSwitcher';
import TeamLoginForm from './team/TeamLoginForm';
import TeamManagementPage from './team/TeamManagementPage';
import ParticipantManagementPage from './team/ParticipantManagementPage';
import TeamDashboard from './team/TeamDashboard';
import MatchList from './matches/MatchList';
import TeamMatchManager from './matches/MatchManager';
import TeamResultEntryPage from './team/TeamResultEntryPage';

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'manager' | 'result'>('manager');
  const [adminSection, setAdminSection] = useState<'matches' | 'teams'>('matches');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [previousTournament, setPreviousTournament] = useState<Tournament | null>(null);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [tournamentMessage, setTournamentMessage] = useState<string | null>(null);
  const { loading, session, user, signOut } = useAuth();
  const { t } = useTranslation();

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
    setAdminSection('matches');
    setView('manager');
    setSelectedMatchId(null);
  }, [selectedTournament?.id]);

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
    clearTeamSession();
    signOut().catch((err) => {
      console.error('Sign-out failed:', err);
    });
  };

  const clearTeamSession = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('team_jwt_token');
        window.localStorage.removeItem('team_id');
        window.localStorage.removeItem('team_name');
      }
    } catch (e) {
      console.warn('Failed to clear team session', e);
    }
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

  useEffect(() => {
    // 管理者セッションがある時はチーム側セッションを常にクリアして衝突を防ぐ
    if (session && isAdmin) {
      clearTeamSession();
    }
  }, [session, isAdmin]);


  const handleTeamSignOut = async () => {
    try {
      await signOut();
    } catch {}
    clearTeamSession();
    navigate('/login');
  };

  const handleTournamentSelected = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setPreviousTournament(null);
    setTournamentMessage(t('app.tournamentSelectedMessage', { tournamentName: tournament.name }));
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
          {t('app.title')}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {selectedTournament ? (
            <Stack spacing={0.5} alignItems="flex-end">
              <Typography variant="caption" color="#9ca3af">
                {t('app.selectedTournament')}
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="#d1d5db">
                {selectedTournament.name}
              </Typography>
            </Stack>
          ) : null}
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
            {t('app.changeTournament')}
          </Button>
          {user?.email ? (
            <Typography variant="body2" color="#d1d5db">
              {user.email}
            </Typography>
          ) : null}
          <Box sx={{ color: 'inherit' }}>
            <LanguageSwitcher />
          </Box>
          <Button variant="outlined" color="inherit" size="small" onClick={handleSignOut}>
            {t('app.logout')}
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
            {t('app.managingTournamentMessage', { tournamentName: selectedTournament.name })}
          </Alert>
        ) : null}
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'center' } }}>
            <ToggleButtonGroup
              exclusive
              value={adminSection}
              onChange={(_, next) => {
                if (next) {
                  setAdminSection(next);
                }
              }}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                bgcolor: '#f6f7fb',
                borderRadius: 999,
                p: 0.5,
                boxShadow: 'inset 0 0 0 1px rgba(24, 32, 56, 0.08)',
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#6a7184',
                  px: 3,
                  border: 'none',
                  borderRadius: 999,
                },
                '& .Mui-selected': {
                  bgcolor: '#f4f7ff',
                  color: '#1a1d2f',
                  boxShadow: '0 6px 18px rgba(34, 53, 102, 0.12)',
                },
              }}
            >
              <ToggleButton value="matches">{t('app.matchManagement')}</ToggleButton>
              <ToggleButton value="teams">{t('app.teamParticipantManagement')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {adminSection === 'matches' ? (
            view === 'manager' ? (
              <MatchManager
                tournament={selectedTournament!}
                onOpenResultEntry={handleOpenResult}
                reloadToken={reloadToken}
              />
            ) : (
              <ResultEntry
                tournament={selectedTournament!}
                matchId={selectedMatchId}
                onBack={handleBackToManager}
                onSaved={handleResultSaved}
              />
            )
          ) : (
            <TeamManagementPage embedded />
          )}
        </Stack>
      </Box>
    </Stack>
  );

  const renderParticipantPlaceholder = () => (
    <Stack sx={{ minHeight: '100vh', bgcolor: '#f4f6fb', alignItems: 'center', justifyContent: 'center', p: 4 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h5" fontWeight="bold">
          {t('app.participantScreenComingSoonTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
          {t('app.participantScreenComingSoonDescription')}
        </Typography>
        <Button variant="outlined" onClick={handleSignOut}>
          {t('app.logout')}
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
      ) : (
        <Routes>
          <Route
            path="/login"
            element={
              session ? (
                <Navigate to="/" />
              ) : (
                <LoginForm
                  onShowPasswordReset={() => {
                    clearTeamSession();
                    navigate('/password-reset');
                  }}
                />
              )
            }
          />
          <Route
            path="/password-reset"
            element={
              session ? (
                <Navigate to="/" />
              ) : (
                <PasswordResetForm
                  onBackToLogin={() => {
                    clearTeamSession();
                    navigate('/login');
                  }}
                />
              )
            }
          />
          <Route
            path="/"
            element={
              session ? (
                isAdmin ? (
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
                  <Navigate to="/team-dashboard" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* Team Management Routes */}
          <Route path="/team-dashboard" element={<TeamDashboard onSignOut={handleTeamSignOut} />} />
          <Route path="/match-manager" element={<TeamMatchManager />} />
          <Route path="/matches" element={<MatchList />} />
          <Route path="/team/matches/:matchId/entry" element={<TeamResultEntryPage />} />
          <Route path="/team-management" element={<TeamManagementPage />} />
          <Route path="/team/:teamId/participants" element={<ParticipantManagementPage />} />
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
      {isAdmin ? (
        <>
          <TournamentCreateDialog
            open={tournamentDialogOpen}
            onClose={() => setTournamentDialogOpen(false)}
            onCreated={(tournament) => {
              setTournamentDialogOpen(false);
              setSelectedTournament(tournament);
              setPreviousTournament(null);
              setTournamentMessage(t('app.tournamentCreatedMessage', { tournamentName: tournament.name }));
            }}
          />
        </>
      ) : null}
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
