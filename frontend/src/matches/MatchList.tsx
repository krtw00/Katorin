import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import MatchEditDialog from './MatchEditDialog';
import { useTeamApi } from '../team/useTeamApi';
import type { MatchRecord } from '../types/matchTypes';
import { parseScoreValue } from '../types/matchTypes';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

type Participant = {
  id: string;
  name: string;
};

type TeamUser = {
  id: string;
  name: string;
  can_edit: boolean; // 常に true（全チームメンバーが編集可能）
};

const PAGE_SIZE = 20;

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

const MatchList: React.FC = () => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();

  const [teamUser, setTeamUser] = useState<TeamUser | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerFilter, setPlayerFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    player: '',
    start: '',
    end: '',
  });

  const [page, setPage] = useState(1);

  const [editTarget, setEditTarget] = useState<MatchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadTeamUser = useCallback(async () => {
    const response = await teamApi('/api/team/current-user');
    if (!response.ok) {
      const message = (await response.text()) || t('matchList.loadPermissionFailed');
      throw new Error(message);
    }
    const data: TeamUser = await response.json();
    setTeamUser(data);
  }, [teamApi, t]);

  const loadParticipants = useCallback(async () => {
    const response = await teamApi('/api/team/participants');
    if (!response.ok) {
      const message = (await response.text()) || t('matchList.loadParticipantsFailed');
      throw new Error(message);
    }
    const data: Participant[] = await response.json();
    setParticipants(data ?? []);
  }, [teamApi, t]);

  const loadMatches = useCallback(async () => {
    const response = await teamApi('/api/team/matches');
    if (!response.ok) {
      const message = (await response.text()) || t('matchManager.fetchMatchesFailed');
      throw new Error(message);
    }
    const data: MatchRecord[] = await response.json();
    setMatches(data ?? []);
  }, [teamApi, t]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTeamUser(), loadParticipants(), loadMatches()]);
    } catch (e: any) {
      setError(e?.message || t('matchList.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadParticipants, loadTeamUser, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filteredMatches = useMemo(() => {
    const { player, start, end } = appliedFilters;
    return matches.filter((match) => {
      const playerName = match.player ?? '';
      if (player && !playerName.toLowerCase().includes(player.toLowerCase())) {
        return false;
      }
      if (start && match.date && match.date < `${start}T00:00:00`) {
        return false;
      }
      if (end && match.date && match.date > `${end}T23:59:59`) {
        return false;
      }
      return true;
    });
  }, [matches, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const pageMatches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMatches.slice(start, start + PAGE_SIZE);
  }, [filteredMatches, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const getOutcomeTag = (match: MatchRecord) => {
    const self = parseScoreValue(match.selfScore);
    const opp = parseScoreValue(match.opponentScore);
    let label = t('matchList.resultPending');
    let color: string = 'default';
    if (self !== null && opp !== null) {
      if (self > opp) {
        label = t('matchList.resultWin');
        color = 'success';
      } else if (self < opp) {
        label = t('matchList.resultLose');
        color = 'error';
      } else {
        label = t('matchList.resultDraw');
        color = 'default';
      }
    }
    return <Tag color={color}>{label}</Tag>;
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      player: playerFilter.trim(),
      start: startDateFilter,
      end: endDateFilter,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setPlayerFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setAppliedFilters({ player: '', start: '', end: '' });
    setPage(1);
  };

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
        const message = (await response.text()) || t('matchList.deleteFailed');
        throw new Error(message);
      }
      setMatches((prev) => prev.filter((match) => match.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e?.message || t('matchList.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const canEdit = Boolean(teamUser?.can_edit);

  const columns: TableColumnsType<MatchRecord> = [
    {
      title: t('matchList.date'),
      dataIndex: 'date',
      key: 'date',
      render: (date: string | null, record: MatchRecord) => (
        <Space direction="vertical" size={0}>
          <Text>{formatDateWithTime(date)}</Text>
          {record.timezone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.timezone}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('matchList.player'),
      dataIndex: 'player',
      key: 'player',
      render: (player: string | null) => player || t('matchList.unknownPlayer'),
    },
    {
      title: t('matchList.score'),
      key: 'score',
      render: (_, record: MatchRecord) =>
        t('matchList.scoreLine', {
          self: record.selfScore ?? '-',
          opponent: record.opponentScore ?? '-',
        }),
    },
    {
      title: t('matchList.opponentTeam'),
      dataIndex: 'opponentTeam',
      key: 'opponentTeam',
      render: (team: string | null) => team || t('matchList.unknownTeam'),
    },
    {
      title: t('matchList.opponentPlayer'),
      dataIndex: 'opponentPlayer',
      key: 'opponentPlayer',
      render: (player: string | null) => player || t('matchList.unknownPlayer'),
    },
    {
      title: t('matchList.result'),
      key: 'result',
      render: (_, record: MatchRecord) => getOutcomeTag(record),
    },
    {
      title: t('matchList.status'),
      dataIndex: 'result_status',
      key: 'result_status',
      render: (status: string) => (
        <Tag color={status === 'finalized' ? 'success' : 'default'}>
          {status === 'finalized'
            ? t('matchList.statusFinalized')
            : t('matchList.statusDraft')}
        </Tag>
      ),
    },
    ...(canEdit
      ? [
          {
            title: t('matchList.actions'),
            key: 'actions',
            align: 'right' as const,
            render: (_: unknown, record: MatchRecord) => (
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => setEditTarget(record)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => setDeleteTarget(record)}
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

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
          <Button onClick={refreshAll}>{t('matchList.retry')}</Button>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 32px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Title level={2} style={{ margin: 0 }}>
            {t('matchList.title')}
          </Title>
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>
            {t('matchList.reload')}
          </Button>
        </Flex>

        <Card>
          <Title level={5}>{t('matchList.filters')}</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Flex gap={16} wrap="wrap">
              <Input
                placeholder={t('matchList.searchPlayer')}
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value)}
                style={{ flex: '1 1 200px' }}
              />
              <DatePicker
                placeholder={t('matchList.dateFrom')}
                value={startDateFilter ? dayjs(startDateFilter) : null}
                onChange={(date) =>
                  setStartDateFilter(date ? date.format('YYYY-MM-DD') : '')
                }
                style={{ flex: '1 1 200px' }}
              />
              <DatePicker
                placeholder={t('matchList.dateTo')}
                value={endDateFilter ? dayjs(endDateFilter) : null}
                onChange={(date) =>
                  setEndDateFilter(date ? date.format('YYYY-MM-DD') : '')
                }
                style={{ flex: '1 1 200px' }}
              />
            </Flex>
            <Space>
              <Button type="primary" onClick={handleApplyFilters}>
                {t('matchList.filter')}
              </Button>
              <Button onClick={handleClearFilters}>{t('matchList.clear')}</Button>
            </Space>
          </Space>
        </Card>

        <Card>
          <Title level={5}>{t('matchList.summary')}</Title>
          <Space wrap>
            <Tag>{t('matchList.totalMatches', { count: filteredMatches.length })}</Tag>
            <Tag color="success">
              {t('matchList.winCount', {
                count: filteredMatches.filter((m) => {
                  const self = Number(m.selfScore ?? NaN);
                  const opp = Number(m.opponentScore ?? NaN);
                  return Number.isFinite(self) && Number.isFinite(opp) && self > opp;
                }).length,
              })}
            </Tag>
            <Tag color="error">
              {t('matchList.lossCount', {
                count: filteredMatches.filter((m) => {
                  const self = Number(m.selfScore ?? NaN);
                  const opp = Number(m.opponentScore ?? NaN);
                  return Number.isFinite(self) && Number.isFinite(opp) && self < opp;
                }).length,
              })}
            </Tag>
          </Space>
        </Card>

        {filteredMatches.length === 0 ? (
          <Alert type="info" message={t('matchList.noMatches')} />
        ) : (
          <Table
            columns={columns}
            dataSource={pageMatches}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: filteredMatches.length,
              onChange: (newPage) => setPage(newPage),
              showSizeChanger: false,
            }}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Space>

      <MatchEditDialog
        open={Boolean(editTarget)}
        match={editTarget}
        participants={participants}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdatedMatch}
      />

      <Modal
        title={t('matchList.deleteTitle')}
        open={Boolean(deleteTarget)}
        onCancel={deleteLoading ? undefined : () => setDeleteTarget(null)}
        onOk={handleDelete}
        okText={deleteLoading ? t('matchList.deleting') : t('matchList.delete')}
        cancelText={t('matchList.cancel')}
        okButtonProps={{ danger: true }}
        confirmLoading={deleteLoading}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>{t('matchList.deleteConfirm')}</Text>
          {deleteError && <Alert type="error" message={deleteError} />}
        </Space>
      </Modal>
    </div>
  );
};

export default MatchList;
