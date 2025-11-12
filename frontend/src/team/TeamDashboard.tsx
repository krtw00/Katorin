import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Flex,
  Input,
  Modal,
  Pagination,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Drawer,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  SyncOutlined,
  LogoutOutlined,
  LinkOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTeamApi } from './useTeamApi';
import MatchEditDialog from '../matches/MatchEditDialog';
import type { MatchRecord } from '../types/matchTypes';
import { parseScoreValue } from '../types/matchTypes';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const COMPLETED_PAGE_SIZE = 25;

type Participant = {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type TeamUser = {
  id: string;
  name: string;
  can_edit: boolean;
};

type CompletedMatchFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
};

type CompletedMatchesResponse = {
  data: MatchRecord[];
  total: number;
  page: number;
  pageSize: number;
};

type Props = {
  onSignOut: () => void;
};

const getOutcome = (match: MatchRecord) => {
  const self = parseScoreValue(match.selfScore);
  const opp = parseScoreValue(match.opponentScore);
  if (self === null || opp === null) return 'pending';
  if (self > opp) return 'win';
  if (self < opp) return 'lose';
  return 'draw';
};

const formatDateTime = (value?: string | null) => {
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

const outcomeMeta: Record<string, { labelKey: string; color: string }> = {
  win: { labelKey: 'matchManager.teamOutcomeWin', color: 'success' },
  lose: { labelKey: 'matchManager.teamOutcomeLose', color: 'error' },
  draw: { labelKey: 'matchManager.teamOutcomeDraw', color: 'processing' },
  pending: { labelKey: 'matchManager.teamOutcomePending', color: 'warning' },
};

const TeamDashboard: React.FC<Props> = ({ onSignOut }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authFetch = useAuthorizedFetch();
  const teamApi = useTeamApi();

  const [activeTab, setActiveTab] = useState<'matches' | 'members' | 'completed'>('matches');
  const [teamId, setTeamId] = useState<string | null>(
    (typeof window !== 'undefined' && window.localStorage.getItem('team_id')) || null
  );
  const [teamName, setTeamName] = useState<string | null>(
    (typeof window !== 'undefined' && window.localStorage.getItem('team_name')) || null
  );
  const [teamLoading, setTeamLoading] = useState<boolean>(true);
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [canEdit, setCanEdit] = useState<boolean>(false);

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberDialogName, setMemberDialogName] = useState('');
  const [memberDialogTarget, setMemberDialogTarget] = useState<Participant | null>(null);
  const [memberDialogError, setMemberDialogError] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const [memberDeleteTarget, setMemberDeleteTarget] = useState<Participant | null>(null);
  const [memberDeleteLoading, setMemberDeleteLoading] = useState(false);
  const [memberDeleteError, setMemberDeleteError] = useState<string | null>(null);

  const [matchEditTarget, setMatchEditTarget] = useState<MatchRecord | null>(null);
  const [matchDeleteTarget, setMatchDeleteTarget] = useState<MatchRecord | null>(null);
  const [matchDeleteLoading, setMatchDeleteLoading] = useState(false);
  const [matchDeleteError, setMatchDeleteError] = useState<string | null>(null);

  const [completedMatches, setCompletedMatches] = useState<MatchRecord[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedError, setCompletedError] = useState<string | null>(null);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedFilters, setCompletedFilters] = useState<CompletedMatchFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [appliedCompletedFilters, setAppliedCompletedFilters] = useState<CompletedMatchFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const [completedDetail, setCompletedDetail] = useState<{
    open: boolean;
    loading: boolean;
    data: MatchRecord | null;
    error: string | null;
  }>({ open: false, loading: false, data: null, error: null });

  const loadTeamProfile = useCallback(async () => {
    setTeamLoading(true);
    setTeamLoadError(null);
    try {
      const res = await authFetch('/api/team/me');
      if (res.status === 401) {
        setTeamLoadError(t('teamDashboard.loadTeamFailed'));
        return;
      }
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.loadTeamFailed');
        throw new Error(msg);
      }
      const data = await res.json();
      setTeamId(data.id);
      setTeamName(data.name);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('team_id', data.id);
          window.localStorage.setItem('team_name', data.name);
        } catch {
          // ignore storage errors
        }
      }
    } catch (e: any) {
      setTeamLoadError(e?.message || t('teamDashboard.loadTeamFailed'));
    } finally {
      setTeamLoading(false);
    }
  }, [authFetch, t]);

  const loadParticipants = useCallback(async () => {
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const res = await teamApi('/api/team/participants');
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.loadParticipantsFailed');
        throw new Error(msg);
      }
      const data: Participant[] = await res.json();
      setParticipants(data ?? []);
    } catch (e: any) {
      setParticipantsError(e?.message || t('teamDashboard.loadParticipantsFailed'));
    } finally {
      setParticipantsLoading(false);
    }
  }, [teamApi, t]);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const res = await teamApi('/api/team/matches?status=all');
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.loadMatchesFailed');
        throw new Error(msg);
      }
      const data: MatchRecord[] = await res.json();
      setMatches(data ?? []);
    } catch (e: any) {
      setMatchesError(e?.message || t('teamDashboard.loadMatchesFailed'));
    } finally {
      setMatchesLoading(false);
    }
  }, [teamApi, t]);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await teamApi('/api/team/current-user');
      if (!res.ok) {
        throw new Error((await res.text()) || t('teamDashboard.loadPermissionFailed'));
      }
      const data: TeamUser = await res.json();
      setCanEdit(Boolean(data.can_edit));
    } catch (e) {
      console.warn('Failed to load team permissions', e);
    }
  }, [teamApi, t]);

  const loadCompletedMatches = useCallback(
    async (pageValue: number, filters: CompletedMatchFilters) => {
      setCompletedLoading(true);
      setCompletedError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageValue));
        params.set('pageSize', String(COMPLETED_PAGE_SIZE));
        if (filters.search) params.set('search', filters.search.trim());
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        const res = await teamApi(`/api/matches/completed?${params.toString()}`);
        if (!res.ok) {
          const msg = (await res.text()) || t('teamDashboard.completedLoadFailed');
          throw new Error(msg);
        }
        const payload: CompletedMatchesResponse = await res.json();
        setCompletedMatches(payload.data ?? []);
        setCompletedTotal(payload.total ?? 0);
        setCompletedPage(payload.page ?? pageValue);
      } catch (e: any) {
        console.error('Failed to load completed matches:', e);
        setCompletedError(e?.message || t('teamDashboard.completedLoadFailed'));
      } finally {
        setCompletedLoading(false);
      }
    },
    [teamApi, t]
  );

  useEffect(() => {
    loadTeamProfile();
    loadPermissions();
    loadParticipants();
    loadMatches();
  }, [loadTeamProfile, loadPermissions, loadParticipants, loadMatches]);

  useEffect(() => {
    loadCompletedMatches(completedPage, appliedCompletedFilters);
  }, [loadCompletedMatches, completedPage, appliedCompletedFilters]);

  const participantsCount = participants.length;

  const stats = useMemo(() => {
    const total = matches.length;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    matches.forEach((match) => {
      const result = getOutcome(match);
      if (result === 'win') wins += 1;
      if (result === 'lose') losses += 1;
      if (result === 'draw') draws += 1;
    });
    const pending = matches.filter((m) => m.result_status !== 'finalized').length;
    const finalized = matches.filter((m) => m.result_status === 'finalized').length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    return { total, wins, losses, draws, pending, finalized, winRate };
  }, [matches]);

  const pendingMatches = useMemo(
    () => matches.filter((match) => match.result_status !== 'finalized'),
    [matches]
  );
  const finalizedMatches = useMemo(
    () => matches.filter((match) => match.result_status === 'finalized').slice(0, 5),
    [matches]
  );

  const openMemberDialog = (participant?: Participant) => {
    setMemberDialogTarget(participant ?? null);
    setMemberDialogName(participant?.name ?? '');
    setMemberDialogError(null);
    setMemberDialogOpen(true);
  };

  const handleMemberSave = async () => {
    if (!memberDialogName.trim()) {
      setMemberDialogError(t('teamDashboard.memberNameRequired'));
      return;
    }
    setMemberSubmitting(true);
    setMemberDialogError(null);
    try {
      const body = JSON.stringify({ name: memberDialogName.trim() });
      const url = memberDialogTarget
        ? `/api/team/participants/${memberDialogTarget.id}`
        : '/api/team/participants';
      const method = memberDialogTarget ? 'PUT' : 'POST';
      const res = await teamApi(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.saveParticipantFailed');
        throw new Error(msg);
      }
      await loadParticipants();
      setMemberDialogOpen(false);
      setMemberDialogTarget(null);
      setMemberDialogName('');
    } catch (e: any) {
      setMemberDialogError(e?.message || t('teamDashboard.saveParticipantFailed'));
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleMemberDelete = async () => {
    if (!memberDeleteTarget) return;
    setMemberDeleteLoading(true);
    setMemberDeleteError(null);
    try {
      const res = await teamApi(`/api/team/participants/${memberDeleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const msg = (await res.text()) || t('teamDashboard.deleteParticipantFailed');
        throw new Error(msg);
      }
      await loadParticipants();
      setMemberDeleteTarget(null);
    } catch (e: any) {
      setMemberDeleteError(e?.message || t('teamDashboard.deleteParticipantFailed'));
    } finally {
      setMemberDeleteLoading(false);
    }
  };

  const handleMatchUpdated = (updated: MatchRecord) => {
    setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
  };

  const handleMatchDelete = async () => {
    if (!matchDeleteTarget) return;
    setMatchDeleteLoading(true);
    setMatchDeleteError(null);
    try {
      const res = await teamApi(`/api/team/matches/${matchDeleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const msg = (await res.text()) || t('teamDashboard.deleteMatchFailed');
        throw new Error(msg);
      }
      setMatches((prev) => prev.filter((match) => match.id !== matchDeleteTarget.id));
      setMatchDeleteTarget(null);
    } catch (e: any) {
      setMatchDeleteError(e?.message || t('teamDashboard.deleteMatchFailed'));
    } finally {
      setMatchDeleteLoading(false);
    }
  };

  const handleCompletedMatchDetail = async (matchId: string) => {
    setCompletedDetail({ open: true, loading: true, data: null, error: null });
    try {
      const res = await teamApi(`/api/matches/${matchId}`);
      if (!res.ok) {
        const msg = (await res.text()) || t('teamDashboard.completedDetailFailed');
        throw new Error(msg);
      }
      const data: MatchRecord = await res.json();
      setCompletedDetail({ open: true, loading: false, data, error: null });
    } catch (e: any) {
      setCompletedDetail({
        open: true,
        loading: false,
        data: null,
        error: e?.message || t('teamDashboard.completedDetailFailed'),
      });
    }
  };

  const handleCompletedFilterApply = () => {
    setAppliedCompletedFilters(completedFilters);
    setCompletedPage(1);
  };

  const handleCompletedFilterReset = () => {
    const emptyFilters = { search: '', dateFrom: '', dateTo: '' };
    setCompletedFilters(emptyFilters);
    setAppliedCompletedFilters(emptyFilters);
    setCompletedPage(1);
  };

  const resolvedTeamName = teamName ?? t('teamDashboard.unknownTeam');

  const memberColumns: ColumnsType<Participant> = [
    {
      title: t('teamDashboard.memberNameLabel'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('teamDashboard.memberUpdatedAt'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 200,
      render: (text: string) => (text ? formatDateTime(text) : '—'),
    },
    {
      title: t('teamDashboard.actions'),
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_: any, record: Participant) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openMemberDialog(record)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setMemberDeleteTarget(record)}
          />
        </Space>
      ),
    },
  ];

  const completedColumns: ColumnsType<MatchRecord> = [
    {
      title: t('teamDashboard.completedMatchColumn'),
      key: 'match',
      render: (_: any, record: MatchRecord) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.team ?? t('teamDashboard.unknownTeam')}</Text>
          <Text type="secondary">
            vs. {record.opponentTeam ?? t('teamDashboard.unknownTeam')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('teamDashboard.completedScoreColumn'),
      key: 'score',
      render: (_: any, record: MatchRecord) => (
        <Space direction="vertical" size="small">
          <Text>
            {t('teamDashboard.scoreValue', {
              self: record.selfScore ?? '-',
              opponent: record.opponentScore ?? '-',
            })}
          </Text>
          <ResultChip match={record} t={t} />
        </Space>
      ),
    },
    {
      title: t('teamDashboard.completedDateColumn'),
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => formatDateTime(text),
    },
    {
      title: t('teamDashboard.actions'),
      key: 'actions',
      width: 120,
      align: 'right',
      render: (_: any, record: MatchRecord) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleCompletedMatchDetail(record.id)}
        >
          {t('teamDashboard.viewDetails')}
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'matches',
      label: t('teamDashboard.matchesTab'),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
              <Space direction="vertical" size="small">
                <Title level={4} style={{ margin: 0 }}>
                  {t('teamDashboard.myMatchesTitle')}
                </Title>
                <Text type="secondary">{t('teamDashboard.myMatchesDescription')}</Text>
              </Space>
              <Button icon={<SyncOutlined />} onClick={loadMatches}>
                {t('teamDashboard.refresh')}
              </Button>
            </Flex>
            <Divider />
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card>
                  <Statistic
                    title={t('teamDashboard.statTotal', { value: '' })}
                    value={stats.total}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card>
                  <Statistic
                    title={t('teamDashboard.statWins', { value: '' })}
                    value={stats.wins}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card>
                  <Statistic
                    title={t('teamDashboard.statLosses', { value: '' })}
                    value={stats.losses}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card>
                  <Statistic
                    title={t('teamDashboard.statDraws', { value: '' })}
                    value={stats.draws}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card>
                  <Statistic
                    title={t('teamDashboard.statPending', { value: '' })}
                    value={stats.pending}
                    valueStyle={{ color: '#d46b08' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card>
                  <Statistic
                    title="Win Rate"
                    value={stats.winRate}
                    suffix="%"
                    valueStyle={{ color: stats.wins > 0 ? '#3f8600' : undefined }}
                  />
                </Card>
              </Col>
            </Row>
            {matchesError && (
              <Alert message={matchesError} type="error" showIcon style={{ marginTop: 16 }} />
            )}
            {matchesLoading && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spin />
              </div>
            )}
          </Card>

          <Card title={t('teamDashboard.pendingSectionTitle')}>
            <Paragraph type="secondary">
              {t('teamDashboard.pendingSectionDescription')}
            </Paragraph>
            {pendingMatches.length === 0 && !matchesLoading ? (
              <Alert message={t('teamDashboard.noPendingMatches')} type="info" showIcon />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {pendingMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    canEdit={canEdit}
                    onEdit={() => setMatchEditTarget(match)}
                    onDelete={() => setMatchDeleteTarget(match)}
                    onReport={() => navigate(`/team/matches/${match.id}/entry`)}
                    onView={() => handleCompletedMatchDetail(match.id)}
                    t={t}
                    teamName={resolvedTeamName}
                  />
                ))}
              </Space>
            )}
          </Card>

          <Card title={t('teamDashboard.completedSectionTitle')}>
            <Paragraph type="secondary">
              {t('teamDashboard.completedSectionDescription')}
            </Paragraph>
            {finalizedMatches.length === 0 ? (
              <Alert message={t('teamDashboard.noCompletedMatches')} type="info" showIcon />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {finalizedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    canEdit={false}
                    onReport={() => navigate(`/team/matches/${match.id}/entry`)}
                    onView={() => handleCompletedMatchDetail(match.id)}
                    t={t}
                    teamName={resolvedTeamName}
                    compact
                  />
                ))}
              </Space>
            )}
          </Card>
        </Space>
      ),
    },
    {
      key: 'members',
      label: t('teamDashboard.membersTab'),
      children: (
        <Card>
          <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
            <Space direction="vertical" size="small">
              <Title level={4} style={{ margin: 0 }}>
                {t('teamDashboard.membersTitle')}
              </Title>
              <Text type="secondary">{t('teamDashboard.membersDescription')}</Text>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openMemberDialog()}>
              {t('teamDashboard.addMember')}
            </Button>
          </Flex>
          {participantsError && (
            <Alert message={participantsError} type="error" showIcon style={{ margin: '16px 0' }} />
          )}
          <Space size="small" style={{ margin: '16px 0' }}>
            <Tag>{t('teamDashboard.totalMembers', { count: participantsCount })}</Tag>
            <Button size="small" icon={<SyncOutlined />} onClick={loadParticipants}>
              {t('teamDashboard.refresh')}
            </Button>
          </Space>
          {participantsLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Spin />
            </div>
          ) : participants.length === 0 ? (
            <Alert message={t('teamDashboard.noMembers')} type="info" showIcon />
          ) : (
            <Table
              columns={memberColumns}
              dataSource={participants}
              rowKey="id"
              size="small"
              pagination={false}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'completed',
      label: t('teamDashboard.completedTab'),
      children: (
        <Card>
          <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
            <Space direction="vertical" size="small">
              <Title level={4} style={{ margin: 0 }}>
                {t('teamDashboard.completedTitle')}
              </Title>
              <Text type="secondary">{t('teamDashboard.completedDescription')}</Text>
            </Space>
            <Button
              icon={<SyncOutlined />}
              onClick={() => loadCompletedMatches(completedPage, appliedCompletedFilters)}
            >
              {t('teamDashboard.refresh')}
            </Button>
          </Flex>
          <Divider />
          <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 24 }}>
            <Input
              placeholder={t('teamDashboard.completedSearch')}
              value={completedFilters.search}
              onChange={(e) =>
                setCompletedFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              prefix={<SearchOutlined />}
            />
            <Space wrap>
              <DatePicker
                placeholder={t('teamDashboard.completedDateFrom')}
                value={completedFilters.dateFrom ? dayjs(completedFilters.dateFrom) : null}
                onChange={(date: Dayjs | null) =>
                  setCompletedFilters((prev) => ({
                    ...prev,
                    dateFrom: date ? date.format('YYYY-MM-DD') : '',
                  }))
                }
              />
              <DatePicker
                placeholder={t('teamDashboard.completedDateTo')}
                value={completedFilters.dateTo ? dayjs(completedFilters.dateTo) : null}
                onChange={(date: Dayjs | null) =>
                  setCompletedFilters((prev) => ({
                    ...prev,
                    dateTo: date ? date.format('YYYY-MM-DD') : '',
                  }))
                }
              />
            </Space>
            <Space>
              <Button type="primary" onClick={handleCompletedFilterApply}>
                {t('teamDashboard.completedApplyFilters')}
              </Button>
              <Button onClick={handleCompletedFilterReset}>
                {t('teamDashboard.completedResetFilters')}
              </Button>
            </Space>
          </Space>
          {completedError && <Alert message={completedError} type="error" showIcon />}
          {completedLoading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Spin />
            </div>
          )}
          {completedMatches.length === 0 && !completedLoading ? (
            <Alert message={t('teamDashboard.completedEmpty')} type="info" showIcon />
          ) : (
            <Table
              columns={completedColumns}
              dataSource={completedMatches}
              rowKey="id"
              pagination={false}
            />
          )}
          {completedTotal > COMPLETED_PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <Pagination
                current={completedPage}
                total={completedTotal}
                pageSize={COMPLETED_PAGE_SIZE}
                onChange={setCompletedPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '20px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space direction="vertical" size="small">
            <Title level={3} style={{ margin: 0, color: '#fff' }}>
              {t('teamDashboard.title')}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.72)' }}>
              {teamName
                ? t('teamDashboard.subtitle', { teamName })
                : t('teamDashboard.subtitleGeneric')}
            </Text>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={onSignOut}>
            {t('teamDashboard.signOut')}
          </Button>
        </Flex>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
        {teamLoadError && (
          <Alert
            message={teamLoadError}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={loadTeamProfile}>
                {t('teamDashboard.retry')}
              </Button>
            }
            style={{ marginBottom: 24 }}
          />
        )}
        {teamLoading && !teamId && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Spin size="large" />
          </div>
        )}

        <Card style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">{t('teamDashboard.summaryLabel')}</Text>
            <Title level={3} style={{ margin: 0 }}>
              {resolvedTeamName}
            </Title>
            <Space wrap>
              <Tag>{t('teamDashboard.totalMembers', { count: participantsCount })}</Tag>
              <Tag color="warning">
                {t('teamDashboard.statPendingChip', { value: stats.pending })}
              </Tag>
              <Tag color="success">
                {t('teamDashboard.statCompletedChip', { value: stats.finalized })}
              </Tag>
            </Space>
          </Space>
        </Card>

        <Card style={{ marginBottom: 24 }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'matches' | 'members' | 'completed')}
            items={tabItems}
          />
        </Card>
      </div>

      <MatchEditDialog
        open={Boolean(matchEditTarget)}
        match={matchEditTarget}
        participants={participants}
        onClose={() => setMatchEditTarget(null)}
        onUpdated={handleMatchUpdated}
      />

      <Modal
        open={Boolean(matchDeleteTarget)}
        title={t('teamDashboard.deleteMatchTitle')}
        onCancel={() => setMatchDeleteTarget(null)}
        onOk={handleMatchDelete}
        okText={t('teamDashboard.delete')}
        cancelText={t('teamDashboard.cancel')}
        okButtonProps={{ danger: true, loading: matchDeleteLoading }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>{t('teamDashboard.deleteMatchBody')}</Text>
          {matchDeleteError && <Alert message={matchDeleteError} type="error" showIcon />}
        </Space>
      </Modal>

      <Modal
        open={memberDialogOpen}
        title={
          memberDialogTarget ? t('teamDashboard.editMember') : t('teamDashboard.addMember')
        }
        onCancel={() => setMemberDialogOpen(false)}
        onOk={handleMemberSave}
        okText={t('teamDashboard.save')}
        cancelText={t('teamDashboard.cancel')}
        okButtonProps={{ loading: memberSubmitting }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {memberDialogError && <Alert message={memberDialogError} type="error" showIcon />}
          <Input
            placeholder={t('teamDashboard.memberNameLabel')}
            value={memberDialogName}
            onChange={(e) => setMemberDialogName(e.target.value)}
            autoFocus
          />
          <Text type="secondary">{t('teamDashboard.memberDialogHelper')}</Text>
        </Space>
      </Modal>

      <Modal
        open={Boolean(memberDeleteTarget)}
        title={t('teamDashboard.deleteMember')}
        onCancel={() => setMemberDeleteTarget(null)}
        onOk={handleMemberDelete}
        okText={t('teamDashboard.delete')}
        cancelText={t('teamDashboard.cancel')}
        okButtonProps={{ danger: true, loading: memberDeleteLoading }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>
            {t('teamDashboard.confirmDeleteMember', { name: memberDeleteTarget?.name ?? '' })}
          </Text>
          {memberDeleteError && <Alert message={memberDeleteError} type="error" showIcon />}
        </Space>
      </Modal>

      <Drawer
        open={completedDetail.open}
        title={t('teamDashboard.completedDetailTitle')}
        onClose={() => setCompletedDetail({ open: false, loading: false, data: null, error: null })}
        width={600}
      >
        {completedDetail.loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Spin size="large" />
          </div>
        ) : completedDetail.error ? (
          <Alert message={completedDetail.error} type="error" showIcon />
        ) : completedDetail.data ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space direction="vertical" size="small">
              <Title level={4} style={{ margin: 0 }}>
                {completedDetail.data.team ?? t('teamDashboard.unknownTeam')} vs.{' '}
                {completedDetail.data.opponentTeam ?? t('teamDashboard.unknownTeam')}
              </Title>
              <Text type="secondary">{formatDateTime(completedDetail.data.date)}</Text>
            </Space>
            <Space wrap>
              <ResultChip match={completedDetail.data} t={t} />
              <Tag color="blue">
                {t('teamDashboard.scoreValue', {
                  self: completedDetail.data.selfScore ?? '-',
                  opponent: completedDetail.data.opponentScore ?? '-',
                })}
              </Tag>
            </Space>
            <DetailRow
              icon={<CalendarOutlined />}
              label={t('teamDashboard.completedMatchupLabel')}
              value={t('teamDashboard.matchupLabel', {
                home: completedDetail.data.team ?? resolvedTeamName,
                away: completedDetail.data.opponentTeam ?? t('teamDashboard.unknownTeam'),
              })}
            />
            <DetailRow
              icon={<ClockCircleOutlined />}
              label={t('teamDashboard.completedDateColumn')}
              value={formatDateTime(completedDetail.data.date) || t('teamDashboard.noDate')}
            />
            {completedDetail.data.tournament_id && (
              <DetailRow
                icon={<LinkOutlined />}
                label={t('teamDashboard.completedTournament')}
                value={completedDetail.data.tournament_id}
              />
            )}
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
};

type MatchCardProps = {
  match: MatchRecord;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onView?: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  teamName: string;
  compact?: boolean;
};

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  canEdit,
  onEdit,
  onDelete,
  onReport,
  onView,
  t,
  teamName,
  compact,
}) => {
  const date = formatDateTime(match.date);
  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Flex justify="space-between" align="center">
          <Text strong>
            {t('teamDashboard.matchupLabel', {
              home: teamName,
              away: match.opponentTeam ?? t('teamDashboard.unknownTeam'),
            })}
          </Text>
          <ResultChip match={match} t={t} />
        </Flex>
        <Text>
          {t('teamDashboard.scoreValue', {
            self: match.selfScore ?? '-',
            opponent: match.opponentScore ?? '-',
          })}
        </Text>
        <Text type="secondary">{date || t('teamDashboard.noDate')}</Text>
        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
          <Space wrap>
            {onReport && match.result_status !== 'finalized' && (
              <Button type="primary" size="small" icon={<LinkOutlined />} onClick={onReport}>
                {t('teamDashboard.reportScore')}
              </Button>
            )}
            {onView && (
              <Button size="small" icon={<EyeOutlined />} onClick={onView}>
                {t('teamDashboard.viewDetails')}
              </Button>
            )}
          </Space>
          {canEdit && !compact && (
            <Space size="small">
              <Button size="small" icon={<EditOutlined />} onClick={onEdit} />
              <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
            </Space>
          )}
        </Flex>
      </Space>
    </Card>
  );
};

type ResultChipProps = {
  match: MatchRecord;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const ResultChip: React.FC<ResultChipProps> = ({ match, t }) => {
  const outcome = getOutcome(match);
  const meta = outcomeMeta[outcome] ?? outcomeMeta.pending;
  return <Tag color={meta.color}>{t(meta.labelKey)}</Tag>;
};

type DetailRowProps = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => (
  <Flex align="start" gap={16}>
    {icon && <div style={{ color: '#00000073', fontSize: 16 }}>{icon}</div>}
    <Space direction="vertical" size={4}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <Text>{value}</Text>
    </Space>
  </Flex>
);

export default TeamDashboard;
