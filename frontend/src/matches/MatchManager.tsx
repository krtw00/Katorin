import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Flex,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTeamApi } from '../team/useTeamApi';
import MatchEditDialog from './MatchEditDialog';
import type { MatchRecord } from '../types/matchTypes';
import { parseScoreValue } from '../types/matchTypes';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

type Participant = {
  id: string;
  name: string;
  can_edit: boolean;
};

type TeamUser = {
  id: string;
  name: string;
  can_edit: boolean;
};

const getOutcome = (match: MatchRecord) => {
  const self = parseScoreValue(match.selfScore);
  const opp = parseScoreValue(match.opponentScore);
  if (self === null || opp === null) return 'pending';
  if (self > opp) return 'win';
  if (self < opp) return 'lose';
  return 'draw';
};

const formatDateWithTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const MatchManager: React.FC = () => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();
  const navigate = useNavigate();
  const [teamUser, setTeamUser] = useState<TeamUser | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<MatchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTeamUser = useCallback(async () => {
    const response = await teamApi('/api/team/current-user');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.teamCurrentUserFailed');
      throw new Error(message);
    }
    const data = (await response.json()) as TeamUser;
    setTeamUser(data);
  }, [teamApi, t]);

  const loadParticipants = useCallback(async () => {
    const response = await teamApi('/api/team/participants');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.teamParticipantsFailed');
      throw new Error(message);
    }
    const data = (await response.json()) as Participant[];
    setParticipants(data ?? []);
  }, [teamApi, t]);

  const loadMatches = useCallback(async () => {
    const response = await teamApi('/api/team/matches');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.fetchMatchesFailed');
      throw new Error(message);
    }
    const data = (await response.json()) as MatchRecord[];
    setMatches(data ?? []);
  }, [teamApi, t]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTeamUser(), loadParticipants(), loadMatches()]);
    } catch (e: any) {
      setError(e?.message || t('matchManager.teamLoadError'));
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadParticipants, loadTeamUser, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // クイック入力は廃止（対戦ごとに詳細入力を行うため）

  const handleUpdatedMatch = (updated: MatchRecord) => {
    setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await teamApi(`/api/team/matches/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = (await response.text()) || t('matchManager.teamDeleteFailed');
        throw new Error(message);
      }
      setMatches((prev) => prev.filter((match) => match.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e?.message || t('matchManager.teamDeleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openMatches = useMemo(
    () => matches.filter((m) => m.result_status !== 'finalized'),
    [matches],
  );

  const stats = useMemo(() => {
    const total = matches.length;
    let wins = 0;
    let losses = 0;
    matches.forEach((match) => {
      const result = getOutcome(match);
      if (result === 'win') wins += 1;
      if (result === 'lose') losses += 1;
    });
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { total, wins, losses, winRate };
  }, [matches]);

  const renderOutcomeTag = (match: MatchRecord) => {
    const outcome = getOutcome(match);
    const labels: Record<string, string> = {
      win: t('matchManager.teamOutcomeWin'),
      lose: t('matchManager.teamOutcomeLose'),
      draw: t('matchManager.teamOutcomeDraw'),
      pending: t('matchManager.teamOutcomePending'),
    };
    const colors: Record<string, string> = {
      win: 'success',
      lose: 'error',
      draw: 'processing',
      pending: 'warning',
    };
    return <Tag color={colors[outcome]}>{labels[outcome]}</Tag>;
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '60vh' }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <Space direction="vertical" size="middle">
          <Alert type="error" message={error} />
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>
            {t('matchManager.teamReload')}
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 32px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/team-dashboard')}
            >
              {t('common.back')}
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              {t('matchManager.teamTitle')}
            </Title>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>
            {t('matchManager.teamReload')}
          </Button>
        </Flex>

        {!teamUser?.can_edit && (
          <Alert type="info" message={t('matchManager.teamReadOnlyNotice')} />
        )}

        <Card>
          <Title level={5}>{t('matchManager.teamStatsTitle')}</Title>
          <Space wrap>
            <StatTag label={t('matchManager.teamStatsTotal', { count: stats.total })} color="purple" />
            <StatTag label={t('matchManager.teamStatsWins', { count: stats.wins })} color="green" />
            <StatTag label={t('matchManager.teamStatsLosses', { count: stats.losses })} color="red" />
            <StatTag label={t('matchManager.teamStatsWinRate', { rate: stats.winRate })} color="blue" />
          </Space>
        </Card>

        <Card>
          <Title level={5}>{t('matchManager.teamOpenMatches')}</Title>
          <Divider style={{ margin: '16px 0' }} />
          {openMatches.length === 0 ? (
            <Alert type="info" message={t('matchManager.teamNoMatchesToday')} />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {openMatches.map((match) => (
                <Card
                  key={match.id}
                  size="small"
                  hoverable
                  onClick={() => {
                    window.location.href = `/team/matches/${match.id}/entry`;
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                      <Space wrap>
                        {renderOutcomeTag(match)}
                        <Text strong>{match.player || t('matchManager.teamUnknownPlayer')}</Text>
                        <Text type="secondary">{formatDateWithTime(match.date)}</Text>
                        {match.timezone && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ({match.timezone})
                          </Text>
                        )}
                      </Space>
                      {teamUser?.can_edit && (
                        <Space>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget(match);
                            }}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(match);
                            }}
                          />
                        </Space>
                      )}
                    </Flex>
                    <Text>
                      {t('matchManager.teamScoreLine', {
                        self: match.selfScore ?? '-',
                        opponent: match.opponentScore ?? '-',
                      })}
                    </Text>
                    <Text type="secondary">
                      {t('matchManager.teamOpponentLine', {
                        team: match.opponentTeam || t('matchManager.teamUnknownTeam'),
                        player: match.opponentPlayer || t('matchManager.teamUnknownPlayer'),
                      })}
                    </Text>
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      </Space>

      <MatchEditDialog
        open={Boolean(editTarget)}
        match={editTarget}
        participants={participants}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdatedMatch}
      />

      <Modal
        title={t('matchManager.teamDeleteTitle')}
        open={Boolean(deleteTarget)}
        onCancel={deleteLoading ? undefined : () => setDeleteTarget(null)}
        onOk={handleDelete}
        okText={deleteLoading ? t('matchManager.teamDeleting') : t('matchManager.teamDelete')}
        cancelText={t('matchManager.teamCancel')}
        okButtonProps={{ danger: true }}
        confirmLoading={deleteLoading}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>{t('matchManager.teamDeleteConfirm')}</Text>
          {deleteError && <Alert type="error" message={deleteError} />}
        </Space>
      </Modal>
    </div>
  );
};

type StatTagProps = {
  label: string;
  color: string;
};

const StatTag: React.FC<StatTagProps> = ({ label, color }) => (
  <Tag color={color} style={{ fontWeight: 600, padding: '4px 12px', fontSize: 14 }}>
    {label}
  </Tag>
);

export default MatchManager;
