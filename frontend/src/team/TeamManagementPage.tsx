import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Alert,
  Button,
  Card,
  Flex,
  Input,
  List,
  Modal,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  SyncOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import Papa from 'papaparse';

const { Title, Text } = Typography;

interface Team {
  id: string;
  name: string;
  username: string;
  created_at: string;
}

interface Participant {
  id: string;
  name: string;
  created_at: string;
  team_id?: string;
}

interface Tournament {
  id: string;
  slug: string;
  name: string;
}

type TeamManagementPageProps = {
  embedded?: boolean;
  tournament?: Tournament;
};

const TeamManagementPage: React.FC<TeamManagementPageProps> = ({
  embedded = false,
  tournament,
}) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const tournamentId = tournament?.id ?? null;
  const tournamentSlug = tournament?.slug ?? null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamDialogError, setTeamDialogError] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamUsername, setTeamUsername] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState<boolean>(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [participantDialogError, setParticipantDialogError] = useState<string | null>(null);
  const [participantSubmitting, setParticipantSubmitting] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participantName, setParticipantName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const missingTournamentContext = !tournamentId || !tournamentSlug;

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  const authHeader = useMemo(() => {
    if (!session?.access_token) {
      return null;
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session]);

  const fetchTeams = useCallback(async () => {
    if (!authHeader) {
      setTeamsLoading(false);
      setTeamsError(t('teamManagement.fetchError'));
      return;
    }
    if (!tournamentId) {
      setTeamsLoading(false);
      setTeamsError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournamentId);
      const response = await fetch(`/api/teams?${params.toString()}`, {
        headers: authHeader,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('teamManagement.fetchError'));
      }
      setTeams(data);
      setSelectedTeamId((prev) => {
        if (prev && data.some((team: Team) => team.id === prev)) {
          return prev;
        }
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setTeamsError(err.message || t('teamManagement.fetchError'));
    } finally {
      setTeamsLoading(false);
    }
  }, [authHeader, t, tournamentId]);

  const fetchParticipants = useCallback(
    async (teamId: string) => {
      if (!authHeader) {
        setParticipants([]);
        setParticipantsError(t('participantManagement.fetchError'));
        return;
      }
      setParticipantsLoading(true);
      setParticipantsError(null);
      try {
        const response = await fetch(`/api/admin/teams/${teamId}/participants`, {
          headers: authHeader,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || t('participantManagement.fetchError'));
        }
        setParticipants(data);
      } catch (err: any) {
        console.error('Failed to fetch participants:', err);
        setParticipantsError(err.message || t('participantManagement.fetchError'));
        setParticipants([]);
      } finally {
        setParticipantsLoading(false);
      }
    },
    [authHeader, t]
  );

  const handleExportTeams = useCallback(async () => {
    if (!authHeader) {
      setExportError(t('teamManagement.exportError'));
      return;
    }
    if (!tournamentId) {
      setExportError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    setExportError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournamentId);
      const response = await fetch(`/api/teams/export?${params.toString()}`, {
        headers: authHeader,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || t('teamManagement.exportError'));
      }

      const csvText = await response.text();
      const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teams_and_participants.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success(t('teamManagement.exportSuccess'));
    } catch (err: any) {
      console.error('Failed to export teams:', err);
      setExportError(err.message || t('teamManagement.exportError'));
    }
  }, [authHeader, t, tournamentId]);

  const handleDownloadTemplate = useCallback(() => {
    const template = [
      ['team_name', 'participant_name'],
      [t('teamManagement.sampleTeamA'), t('teamManagement.samplePlayerTanaka')],
      [t('teamManagement.sampleTeamA'), t('teamManagement.samplePlayerSuzuki')],
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_participant_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, [t]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!authHeader) {
        setImportError(t('teamManagement.importError'));
        return;
      }
      if (!tournamentSlug) {
        setImportError(t('teamManagement.tournamentSlugRequired'));
        return;
      }
      const file = event.target.files?.[0];
      if (!file) return;

      setImportError(null);
      setImportSuccess(null);
      setTeamSubmitting(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tournament_slug', tournamentSlug);

      try {
        const response = await fetch('/api/teams/import', {
          method: 'POST',
          headers: authHeader,
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('teamManagement.importError'));
        }

        setImportSuccess(
          t('teamManagement.importSuccess', {
            teams: data.teamsCreatedCount,
            participants: data.participantsCreatedCount,
          })
        );
        await fetchTeams();
        message.success(
          t('teamManagement.importSuccess', {
            teams: data.teamsCreatedCount,
            participants: data.participantsCreatedCount,
          })
        );
      } catch (err: any) {
        console.error('Failed to import teams:', err);
        setImportError(err.message || t('teamManagement.importError'));
      } finally {
        setTeamSubmitting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [authHeader, fetchTeams, t, tournamentSlug]
  );

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchParticipants(selectedTeamId);
    } else {
      setParticipants([]);
    }
  }, [fetchParticipants, selectedTeamId]);

  const handleOpenCreateTeam = () => {
    setCurrentTeam(null);
    setTeamName('');
    setTeamDialogError(null);
    setTeamDialogOpen(true);
    setGeneratedPassword(null);
  };

  const handleOpenEditTeam = (team: Team) => {
    setCurrentTeam(team);
    setTeamName(team.name);
    setTeamUsername(team.username);
    setTeamPassword('');
    setTeamDialogError(null);
    setTeamDialogOpen(true);
    setGeneratedPassword(null);
  };

  const handleCloseTeamDialog = () => {
    if (teamSubmitting) return;
    setTeamDialogOpen(false);
    setGeneratedPassword(null);
    setShowPassword(false);
    setCopySuccess(false);
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopySuccess(true);
      message.success(t('teamManagement.copySuccess'));
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSaveTeam = async () => {
    setTeamDialogError(null);
    if (!authHeader) {
      setTeamDialogError(t('teamManagement.saveError'));
      return;
    }

    const method = currentTeam ? 'PUT' : 'POST';
    const url = currentTeam ? `/api/teams/${currentTeam.id}` : '/api/teams/register';
    let body: Record<string, unknown>;

    if (currentTeam) {
      if (!teamName.trim() || !teamUsername.trim()) {
        setTeamDialogError(t('teamManagement.allFieldsRequired'));
        return;
      }
      body = {
        name: teamName.trim(),
        username: teamUsername.trim(),
      };
      if (tournamentSlug) {
        body.tournament_slug = tournamentSlug;
      }
      if (teamPassword) {
        body.password = teamPassword;
      }
    } else {
      if (!teamName.trim()) {
        setTeamDialogError(t('teamManagement.teamNameRequired'));
        return;
      }
      if (!tournamentSlug) {
        setTeamDialogError(t('teamManagement.tournamentSlugRequired'));
        return;
      }
      body = {
        name: teamName.trim(),
        tournament_slug: tournamentSlug,
      };
    }

    setTeamSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('teamManagement.saveError'));
      }

      if (!currentTeam && data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        setTeamDialogOpen(false);
      }

      await fetchTeams();
      message.success(
        currentTeam ? t('teamManagement.updateSuccess') : t('teamManagement.createSuccess')
      );
    } catch (err: any) {
      console.error('Failed to save team:', err);
      setTeamDialogError(err.message || t('teamManagement.saveError'));
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!authHeader) {
      setTeamsError(t('teamManagement.deleteError'));
      return;
    }
    Modal.confirm({
      title: t('teamManagement.confirmDelete'),
      onOk: async () => {
        setTeamSubmitting(true);
        setTeamsError(null);
        try {
          const response = await fetch(`/api/teams/${teamId}`, {
            method: 'DELETE',
            headers: authHeader,
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || t('teamManagement.deleteError'));
          }

          await fetchTeams();
          setSelectedTeamId((prev) => (prev === teamId ? null : prev));
          message.success(t('teamManagement.deleteSuccess'));
        } catch (err: any) {
          console.error('Failed to delete team:', err);
          setTeamsError(err.message || t('teamManagement.deleteError'));
        } finally {
          setTeamSubmitting(false);
        }
      },
    });
  };

  const handleOpenParticipantDialog = (participant?: Participant) => {
    if (!selectedTeam) {
      setParticipantsError(t('participantManagement.teamIdMissing'));
      return;
    }
    setCurrentParticipant(participant ?? null);
    setParticipantName(participant?.name ?? '');
    setParticipantDialogError(null);
    setParticipantDialogOpen(true);
  };

  const handleCloseParticipantDialog = () => {
    if (participantSubmitting) return;
    setParticipantDialogOpen(false);
  };

  const handleSaveParticipant = async () => {
    if (!selectedTeam) {
      setParticipantDialogError(t('participantManagement.teamIdMissing'));
      return;
    }
    if (!participantName) {
      setParticipantDialogError(t('participantManagement.nameRequired'));
      return;
    }
    if (!authHeader) {
      setParticipantDialogError(t('participantManagement.saveError'));
      return;
    }
    setParticipantSubmitting(true);
    try {
      const method = currentParticipant ? 'PUT' : 'POST';
      const url = currentParticipant
        ? `/api/admin/participants/${currentParticipant.id}`
        : `/api/admin/teams/${selectedTeam.id}/participants`;
      const payload: Record<string, unknown> = {
        name: participantName,
      };
      if (currentParticipant) {
        payload.team_id = selectedTeam.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.saveError'));
      }

      await fetchParticipants(selectedTeam.id);
      setParticipantDialogOpen(false);
      message.success(
        currentParticipant
          ? t('participantManagement.updateSuccess')
          : t('participantManagement.createSuccess')
      );
    } catch (err: any) {
      console.error('Failed to save participant:', err);
      setParticipantDialogError(err.message || t('participantManagement.saveError'));
    } finally {
      setParticipantSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!selectedTeam) {
      setParticipantsError(t('participantManagement.teamIdMissing'));
      return;
    }
    if (!authHeader) {
      setParticipantsError(t('participantManagement.deleteError'));
      return;
    }
    Modal.confirm({
      title: t('participantManagement.confirmDelete'),
      onOk: async () => {
        setParticipantSubmitting(true);
        setParticipantsError(null);
        try {
          const response = await fetch(`/api/admin/participants/${participantId}`, {
            method: 'DELETE',
            headers: authHeader,
          });

          if (!response.ok && response.status !== 204) {
            const data = await response.json();
            throw new Error(data.error || t('participantManagement.deleteError'));
          }

          await fetchParticipants(selectedTeam.id);
          message.success(t('participantManagement.deleteSuccess'));
        } catch (err: any) {
          console.error('Failed to delete participant:', err);
          setParticipantsError(err.message || t('participantManagement.deleteError'));
        } finally {
          setParticipantSubmitting(false);
        }
      },
    });
  };

  if (teamsLoading && teams.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: embedded ? 360 : '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: embedded ? 0 : '16px 32px' }}>
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={16}
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="small">
          <Title level={embedded ? 3 : 2} style={{ margin: 0, fontWeight: 'bold' }}>
            {t('teamManagement.title')}
          </Title>
          <Text type="secondary">{t('participantManagement.title')}</Text>
        </Space>
        <Space wrap>
          <Button
            icon={<CloudDownloadOutlined />}
            onClick={handleExportTeams}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('teamManagement.exportTeams')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleDownloadTemplate}
            disabled={teamSubmitting}
          >
            {t('teamManagement.downloadTemplate')}
          </Button>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleImportClick}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('teamManagement.importTeams')}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <Button
            icon={<SyncOutlined />}
            onClick={fetchTeams}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('common.refresh')}
          </Button>
          <Button
            type="primary"
            icon={<TeamOutlined />}
            onClick={handleOpenCreateTeam}
            disabled={teamSubmitting || missingTournamentContext}
          >
            {t('teamManagement.createTeam')}
          </Button>
        </Space>
      </Flex>

      {missingTournamentContext && (
        <Alert
          message={t('teamManagement.tournamentSlugRequired')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {importError && (
        <Alert message={importError} type="error" showIcon style={{ marginBottom: 16 }} />
      )}
      {importSuccess && (
        <Alert message={importSuccess} type="success" showIcon style={{ marginBottom: 16 }} />
      )}
      {exportError && (
        <Alert message={exportError} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {teamsError && (
        <Alert message={teamsError} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {teams.length === 0 ? (
        <Alert message={t('teamManagement.noTeams')} type="info" showIcon />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: embedded ? '1fr' : 'minmax(0, 0.45fr) minmax(0, 1fr)',
            gap: embedded ? 16 : 24,
          }}
        >
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Text strong>{t('teamManagement.title')}</Text>
                <Text type="secondary">
                  {t('common.total')}: {teams.length}
                </Text>
              </Flex>
            }
            style={{
              border: embedded ? '1px dashed rgba(24, 32, 56, 0.18)' : undefined,
            }}
            bodyStyle={{ padding: 0 }}
          >
            <List
              dataSource={teams}
              renderItem={(team) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    backgroundColor: team.id === selectedTeamId ? '#f0f5ff' : undefined,
                  }}
                  onClick={() => setSelectedTeamId(team.id)}
                  actions={[
                    <Button
                      key="edit"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditTeam(team);
                      }}
                      disabled={teamSubmitting}
                    />,
                    <Button
                      key="delete"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id);
                      }}
                      disabled={teamSubmitting}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text strong>{team.name}</Text>}
                    description={`@${team.username}`}
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card
            title={
              selectedTeam
                ? t('participantManagement.titleForTeam', { teamName: selectedTeam.name })
                : t('participantManagement.title')
            }
            extra={
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => handleOpenParticipantDialog()}
                disabled={!selectedTeam || participantSubmitting}
              >
                {t('participantManagement.addParticipant')}
              </Button>
            }
            style={{
              border: embedded ? '1px dashed rgba(24, 32, 56, 0.18)' : undefined,
              minHeight: 320,
            }}
          >
            {participantsError && (
              <Alert message={participantsError} type="error" showIcon style={{ marginBottom: 16 }} />
            )}
            {!selectedTeam ? (
              <Alert message={t('teamManagement.noTeams')} type="info" showIcon />
            ) : participantsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Spin />
              </div>
            ) : participants.length === 0 ? (
              <Alert message={t('participantManagement.noParticipants')} type="info" showIcon />
            ) : (
              <List
                dataSource={participants}
                renderItem={(participant) => (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenParticipantDialog(participant)}
                        disabled={participantSubmitting}
                      />,
                      <Button
                        key="delete"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteParticipant(participant.id)}
                        disabled={participantSubmitting}
                      />,
                    ]}
                  >
                    <List.Item.Meta title={<Text strong>{participant.name}</Text>} />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      )}

      <Modal
        open={teamDialogOpen}
        title={currentTeam ? t('teamManagement.editTeam') : t('teamManagement.createTeam')}
        onCancel={handleCloseTeamDialog}
        footer={
          generatedPassword ? (
            <Button type="primary" onClick={handleCloseTeamDialog} disabled={teamSubmitting}>
              {t('common.close')}
            </Button>
          ) : (
            [
              <Button key="cancel" onClick={handleCloseTeamDialog} disabled={teamSubmitting}>
                {t('common.cancel')}
              </Button>,
              <Button
                key="save"
                type="primary"
                onClick={handleSaveTeam}
                loading={teamSubmitting}
              >
                {t('common.save')}
              </Button>,
            ]
          )
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {teamDialogError && <Alert message={teamDialogError} type="error" showIcon />}
          <Input
            placeholder={t('teamManagement.teamName')}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={teamSubmitting || !!generatedPassword}
          />
          {currentTeam && (
            <>
              <Input
                placeholder={t('teamManagement.username')}
                value={teamUsername}
                onChange={(e) => setTeamUsername(e.target.value)}
                disabled={teamSubmitting}
              />
              <Input.Password
                placeholder={t('teamManagement.password')}
                value={teamPassword}
                onChange={(e) => setTeamPassword(e.target.value)}
                disabled={teamSubmitting}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('teamManagement.leaveBlankForNoChange')}
              </Text>
            </>
          )}
          {generatedPassword && (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">{t('teamManagement.generatedPassword')}</Text>
              <Input.Password
                value={generatedPassword}
                readOnly
                visibilityToggle={{
                  visible: showPassword,
                  onVisibleChange: setShowPassword,
                }}
                addonAfter={
                  <Button
                    size="small"
                    type="link"
                    onClick={handleCopyPassword}
                    disabled={teamSubmitting}
                  >
                    {t('common.copy')}
                  </Button>
                }
              />
              {copySuccess && (
                <Alert
                  message={t('teamManagement.copySuccess')}
                  type="success"
                  showIcon
                  style={{ padding: '4px 8px', fontSize: 12 }}
                />
              )}
            </Space>
          )}
        </Space>
      </Modal>

      <Modal
        open={participantDialogOpen}
        title={
          currentParticipant
            ? t('participantManagement.editParticipant')
            : t('participantManagement.addParticipant')
        }
        onCancel={handleCloseParticipantDialog}
        onOk={handleSaveParticipant}
        okText={currentParticipant ? t('common.update') : t('common.create')}
        cancelText={t('common.cancel')}
        okButtonProps={{ loading: participantSubmitting }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {participantDialogError && (
            <Alert message={participantDialogError} type="error" showIcon />
          )}
          <Input
            placeholder={t('participantManagement.participantName')}
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            disabled={participantSubmitting}
          />
        </Space>
      </Modal>
    </div>
  );
};

export default TeamManagementPage;
