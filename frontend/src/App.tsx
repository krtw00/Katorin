import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Flex, Typography, Alert, Spin, Segmented, Tooltip, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
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
import TeamManagementPage from './team/TeamManagementPage';
import ParticipantManagementPage from './team/ParticipantManagementPage';
import TeamDashboard from './team/TeamDashboard';
import MatchList from './matches/MatchList';
import TeamMatchManager from './matches/MatchManager';
import TeamResultEntryPage from './team/TeamResultEntryPage';

const { Title, Text } = Typography;

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
  const [messageApi, contextHolder] = message.useMessage();

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
      window.localStorage.setItem('katorin:selectedTournamentSlug', selectedTournament.slug);
      window.dispatchEvent(new CustomEvent('katorin:tournamentChanged', { detail: selectedTournament }));
    } else {
      window.localStorage.removeItem('katorin:selectedTournamentId');
      window.localStorage.removeItem('katorin:selectedTournamentName');
      window.localStorage.removeItem('katorin:selectedTournamentSlug');
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

  const handleCopyTournamentCode = async () => {
    if (selectedTournament?.slug) {
      try {
        await navigator.clipboard.writeText(selectedTournament.slug);
        messageApi.success(t('app.tournamentCodeCopied'));
      } catch (err) {
        console.error('Failed to copy tournament code:', err);
        messageApi.error('Failed to copy tournament code');
      }
    }
  };

  const renderAdminMainView = () => (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6fb' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#1f2937',
          color: '#fff',
        }}
      >
        <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>
          {t('app.title')}
        </Title>
        <Space size="large" align="center">
          {selectedTournament ? (
            <Space direction="vertical" size={4} align="end">
              <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
                {t('app.selectedTournament')}
              </Text>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#d1d5db' }}>
                {selectedTournament.name}
              </Text>
              <Space size={4} align="center">
                <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {t('app.tournamentCode')}:
                </Text>
                <Text
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#d1d5db',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {selectedTournament.slug}
                </Text>
                <Tooltip title={t('app.tournamentCode')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyTournamentCode}
                    style={{
                      color: '#9ca3af',
                    }}
                  />
                </Tooltip>
              </Space>
            </Space>
          ) : null}
          <Button
            type="text"
            size="small"
            style={{ color: '#fff' }}
            onClick={() => {
              setPreviousTournament(selectedTournament);
              setSelectedTournament(null);
              setTournamentMessage(null);
            }}
          >
            {t('app.changeTournament')}
          </Button>
          {user?.email ? (
            <Text style={{ fontSize: '14px', color: '#d1d5db' }}>
              {user.email}
            </Text>
          ) : null}
          <div style={{ color: 'inherit' }}>
            <LanguageSwitcher />
          </div>
          <Button
            size="small"
            style={{ color: '#fff', borderColor: '#fff' }}
            onClick={handleSignOut}
          >
            {t('app.logout')}
          </Button>
        </Space>
      </header>
      <main style={{ flex: 1, padding: window.innerWidth < 768 ? '16px' : '32px' }}>
        {tournamentMessage ? (
          <Alert
            type="success"
            message={tournamentMessage}
            closable
            onClose={() => setTournamentMessage(null)}
            style={{ marginBottom: '16px' }}
          />
        ) : null}
        {selectedTournament ? (
          <Alert
            type="info"
            message={t('app.managingTournamentMessage', { tournamentName: selectedTournament.name })}
            style={{ marginBottom: '16px' }}
          />
        ) : null}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Flex justify="center">
            <Segmented
              value={adminSection}
              onChange={(value) => {
                setAdminSection(value as 'matches' | 'teams');
              }}
              options={[
                { label: t('app.matchManagement'), value: 'matches' },
                { label: t('app.teamParticipantManagement'), value: 'teams' },
              ]}
              style={{
                backgroundColor: '#f6f7fb',
                fontWeight: 700,
                fontSize: '14px',
              }}
            />
          </Flex>
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
            <TeamManagementPage embedded tournament={selectedTournament ?? undefined} />
          )}
        </Space>
      </main>
    </div>
  );

  return (
    <>
      {contextHolder}
      {loading ? (
        <Flex
          align="center"
          justify="center"
          style={{
            minHeight: '100vh',
            backgroundColor: '#f4f6fb',
          }}
        >
          <Spin size="large" />
        </Flex>
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
          <Route path="/team-management" element={<TeamManagementPage tournament={selectedTournament ?? undefined} />} />
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
