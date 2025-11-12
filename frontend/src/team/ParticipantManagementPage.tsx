import React, { useEffect, useState, useCallback } from 'react';
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
import { EditOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

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

const getStoredTournamentId = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem('katorin:selectedTournamentId');
  } catch (err) {
    console.warn('Failed to read stored tournament id', err);
    return null;
  }
};

const ParticipantManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [newTeamId, setNewTeamId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const authFetch = useAuthorizedFetch();

  const fetchTeamDetails = useCallback(async () => {
    try {
      const response = await authFetch(`/api/team/me`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchTeamError'));
      }
      setTeamName(data.name);
    } catch (err: any) {
      console.error('Failed to fetch team details:', err);
      setError(err.message || t('participantManagement.fetchTeamError'));
    }
  }, [authFetch, t]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/team/participants`);
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
  }, [authFetch, t]);

  const fetchTeamsForMove = useCallback(async () => {
    try {
      const storedTournamentId = getStoredTournamentId();
      const query = storedTournamentId ? `?tournament_id=${encodeURIComponent(storedTournamentId)}` : '';
      const response = await authFetch(`/api/teams${query}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.fetchTeamsForMoveError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams for move:', err);
    }
  }, [authFetch, t]);

  useEffect(() => {
    fetchTeamDetails();
    fetchParticipants();
    fetchTeamsForMove();
  }, [fetchTeamDetails, fetchParticipants, fetchTeamsForMove]);

  const handleOpenCreateDialog = () => {
    setCurrentParticipant(null);
    setParticipantName('');
    setNewTeamId(teamId || null);
    setDialogError(null);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (participant: Participant) => {
    setCurrentParticipant(participant);
    setParticipantName(participant.name);
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
      const url = currentParticipant
        ? `/api/team/participants/${currentParticipant.id}`
        : `/api/team/participants`;
      const body: any = { name: participantName };
      if (currentParticipant && newTeamId && newTeamId !== currentParticipant.team_id) {
        body.team_id = newTeamId;
      }

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('participantManagement.saveError'));
      }

      fetchParticipants();
      handleCloseDialog();
      message.success(
        currentParticipant
          ? t('participantManagement.updateSuccess')
          : t('participantManagement.createSuccess')
      );
    } catch (err: any) {
      console.error('Failed to save participant:', err);
      setDialogError(err.message || t('participantManagement.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    Modal.confirm({
      title: t('participantManagement.confirmDelete'),
      onOk: async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await authFetch(`/api/team/participants/${participantId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || t('participantManagement.deleteError'));
          }

          fetchParticipants();
          message.success(t('participantManagement.deleteSuccess'));
        } catch (err: any) {
          console.error('Failed to delete participant:', err);
          setError(err.message || t('participantManagement.deleteError'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  if (loading && !participants.length && !teamName) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="small">
          <Title level={4} style={{ margin: 0, fontWeight: 'bold' }}>
            {teamName
              ? t('participantManagement.titleForTeam', { teamName })
              : t('participantManagement.title')}
          </Title>
          <Text type="secondary">{t('participantManagement.description')}</Text>
        </Space>
        <Button type="primary" icon={<UserAddOutlined />} onClick={handleOpenCreateDialog}>
          {t('participantManagement.addParticipant')}
        </Button>
      </Flex>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {participants.length === 0 && !loading ? (
        <Alert message={t('participantManagement.noParticipants')} type="info" showIcon />
      ) : (
        <Card>
          <List
            dataSource={participants}
            renderItem={(participant) => (
              <List.Item
                actions={[
                  <Button
                    key="edit"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenEditDialog(participant)}
                  >
                    {t('common.edit')}
                  </Button>,
                  <Button
                    key="delete"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteParticipant(participant.id)}
                  >
                    {t('common.delete')}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Text strong>{participant.name}</Text>}
                  description={
                    participant.can_edit
                      ? t('participantManagement.canEdit')
                      : t('participantManagement.cannotEdit')
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      <Modal
        open={openDialog}
        title={
          currentParticipant
            ? t('participantManagement.editParticipant')
            : t('participantManagement.addParticipant')
        }
        onCancel={handleCloseDialog}
        onOk={handleSaveParticipant}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ loading: loading }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {dialogError && <Alert message={dialogError} type="error" showIcon />}
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text>{t('participantManagement.participantName')}</Text>
            <Input
              placeholder={t('participantManagement.participantName')}
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              autoFocus
            />
          </Space>
          {currentParticipant && (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text>{t('participantManagement.moveToTeam')}</Text>
              <select
                value={newTeamId || ''}
                onChange={(e) => setNewTeamId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Space>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default ParticipantManagementPage;
