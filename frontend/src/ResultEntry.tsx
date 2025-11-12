import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Flex,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Team {
  id: string;
  name: string;
}

type GameRow = {
  id: string;
  homeTeam: string;
  homePlayer: string;
  homeDeck: string;
  homeScore: string;
  awayTeam: string;
  awayPlayer: string;
  awayDeck: string;
  awayScore: string;
};

type MatchRecord = {
  id: string;
  team: string | null;
  player: string | null;
  deck: string | null;
  selfScore: string | null;
  opponentScore: string | null;
  opponentTeam: string | null;
  opponentPlayer: string | null;
  opponentDeck: string | null;
  date: string | null;
};

type MatchFormValues = {
  team: string;
  opponentTeam: string;
  date: string;
};

type ResultEntryProps = {
  tournament: Tournament | null;
  matchId: string | null;
  onBack: () => void;
  onSaved: () => void;
};

type ScoreStatus = 'homeWin' | 'awayWin' | 'draw' | 'pending';

const emptyForm: MatchFormValues = { team: '', opponentTeam: '', date: '' };
const emptyRow: GameRow = {
  id: '',
  homeTeam: '',
  homePlayer: '',
  homeDeck: '',
  homeScore: '',
  awayTeam: '',
  awayPlayer: '',
  awayDeck: '',
  awayScore: '',
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseScore = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const statusMeta: Record<
  ScoreStatus,
  { color: string; homeHighlight: boolean; awayHighlight: boolean }
> = {
  homeWin: { color: 'success', homeHighlight: true, awayHighlight: false },
  awayWin: { color: 'success', homeHighlight: false, awayHighlight: true },
  draw: { color: 'default', homeHighlight: false, awayHighlight: false },
  pending: { color: 'warning', homeHighlight: false, awayHighlight: false },
};

const getInitial = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : '?';
};

const ResultEntry: React.FC<ResultEntryProps> = ({ tournament, matchId, onBack, onSaved }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const [form, setForm] = useState<MatchFormValues>(emptyForm);
  const [gameRows, setGameRows] = useState<GameRow[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [persistedScores, setPersistedScores] = useState<{ home: string; away: string }>({
    home: '',
    away: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [rowModalState, setRowModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    draft: GameRow;
  }>({
    open: false,
    mode: 'create',
    draft: emptyRow,
  });
  const [deleteState, setDeleteState] = useState<{ open: boolean; targetId?: string }>({
    open: false,
  });
  const [initialized, setInitialized] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const fetchTeams = useCallback(async () => {
    if (!tournament?.id) {
      setError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournament.id);
      const response = await authFetch(`/api/teams?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  }, [authFetch, tournament?.id, t]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const makeSnapshot = useCallback(
    (formValues: MatchFormValues, rows: GameRow[]) =>
      JSON.stringify({
        team: formValues.team,
        opponentTeam: formValues.opponentTeam,
        date: formValues.date,
        gameRows: rows,
      }),
    []
  );

  const totals = useMemo(() => {
    let homeTotal = 0;
    let awayTotal = 0;
    let pending = 0;

    gameRows.forEach((row) => {
      const home = parseScore(row.homeScore);
      const away = parseScore(row.awayScore);
      if (home === null || away === null) {
        pending += 1;
        return;
      }
      homeTotal += home;
      awayTotal += away;
    });

    return { homeTotal, awayTotal, pending };
  }, [gameRows]);

  const scoreState: ScoreStatus = useMemo(() => {
    if (!isFinalized) {
      return 'pending';
    }
    if (totals.homeTotal > totals.awayTotal) return 'homeWin';
    if (totals.homeTotal < totals.awayTotal) return 'awayWin';
    return 'draw';
  }, [isFinalized, totals]);

  const scoreStatusMeta = statusMeta[scoreState];
  const scoreStatusLabel = useMemo(() => {
    if (!isFinalized) {
      return gameRows.length === 0
        ? t('resultEntry.notRegistered')
        : t('resultEntry.pending');
    }
    if (scoreState === 'homeWin') {
      return `${form.team || t('resultEntry.homeTeam')} ${t('resultEntry.win')}`;
    }
    if (scoreState === 'awayWin') {
      return `${form.opponentTeam || t('resultEntry.awayTeam')} ${t('resultEntry.win')}`;
    }
    if (scoreState === 'draw') {
      return t('resultEntry.draw');
    }
    return gameRows.length === 0
      ? t('resultEntry.notRegistered')
      : t('resultEntry.pending');
  }, [isFinalized, scoreState, form.team, form.opponentTeam, gameRows.length, t]);

  const snapshot = useMemo(() => makeSnapshot(form, gameRows), [form, gameRows, makeSnapshot]);

  const fetchMatch = useCallback(async () => {
    if (!matchId || teams.length === 0) {
      setForm(emptyForm);
      setGameRows([]);
      setError(null);
      setInitialized(false);
      setLastSavedSnapshot('');
      setLastSavedAt(null);
      setIsFinalized(false);
      setPersistedScores({ home: '', away: '' });
      return;
    }

    setLoading(true);
    setError(null);
    setSaveFeedback(null);
    setInitialized(false);
    try {
      const response = await authFetch(`/api/matches/${matchId}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const data: MatchRecord = await response.json();
      const homeTeamName = teams.find((t) => t.id === data.team)?.name ?? data.team ?? '';
      const awayTeamName =
        teams.find((t) => t.id === data.opponentTeam)?.name ?? data.opponentTeam ?? '';

      const newFormState: MatchFormValues = {
        team: homeTeamName,
        opponentTeam: awayTeamName,
        date: data.date ? data.date.slice(0, 10) : '',
      };
      setForm(newFormState);
      setPersistedScores({
        home: data.selfScore ?? '',
        away: data.opponentScore ?? '',
      });
      try {
        const parsed = data.player ? JSON.parse(data.player) : [];
        if (Array.isArray(parsed)) {
          const mappedRows = parsed.map((row: any) => ({
            id: typeof row.id === 'string' ? row.id : generateId(),
            homeTeam: row.homeTeam ?? homeTeamName,
            homePlayer: row.homePlayer ?? '',
            homeDeck: row.homeDeck ?? '',
            homeScore: row.homeScore ?? '',
            awayTeam: row.awayTeam ?? awayTeamName,
            awayPlayer: row.awayPlayer ?? '',
            awayDeck: row.awayDeck ?? '',
            awayScore: row.awayScore ?? '',
          }));
          setGameRows(mappedRows);
          setIsFinalized(false);
          setLastSavedSnapshot(makeSnapshot(newFormState, mappedRows));
          setLastSavedAt(new Date());
          setInitialized(true);
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rounds)) {
          const mappedRows = parsed.rounds.map((row: any) => ({
            id: typeof row.id === 'string' ? row.id : generateId(),
            homeTeam: row.homeTeam ?? homeTeamName,
            homePlayer: row.homePlayer ?? '',
            homeDeck: row.homeDeck ?? '',
            homeScore: row.homeScore ?? '',
            awayTeam: row.awayTeam ?? awayTeamName,
            awayPlayer: row.awayPlayer ?? '',
            awayDeck: row.awayDeck ?? '',
            awayScore: row.awayScore ?? '',
          }));
          setGameRows(mappedRows);
          setIsFinalized(Boolean(parsed.finalized));
          if (parsed.finalized && parsed.totals) {
            setPersistedScores({
              home: String(parsed.totals.home ?? data.selfScore ?? ''),
              away: String(parsed.totals.away ?? data.opponentScore ?? ''),
            });
          } else {
            setPersistedScores({ home: '', away: '' });
          }
          setLastSavedSnapshot(makeSnapshot(newFormState, mappedRows));
          setLastSavedAt(new Date());
          setInitialized(true);
        } else {
          setGameRows([]);
          setIsFinalized(false);
          setPersistedScores({ home: '', away: '' });
          setLastSavedSnapshot(makeSnapshot(newFormState, []));
          setLastSavedAt(new Date());
          setInitialized(true);
        }
      } catch {
        setGameRows([]);
        setIsFinalized(false);
        setPersistedScores({ home: '', away: '' });
        setLastSavedSnapshot(makeSnapshot(newFormState, []));
        setLastSavedAt(new Date());
        setInitialized(true);
      }
    } catch (err) {
      console.error('Error fetching match:', err);
      setError(t('resultEntry.fetchError'));
      setInitialized(false);
      setIsFinalized(false);
      setPersistedScores({ home: '', away: '' });
    } finally {
      setLoading(false);
    }
  }, [authFetch, makeSnapshot, matchId, teams, t]);

  useEffect(() => {
    if (teams.length > 0) {
      fetchMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, teams.length]);

  const handleSave = useCallback(
    async (mode: 'auto' | 'finalize' | 'unfinalize', snapshotValue: string) => {
      if (!matchId) {
        return;
      }

      const isAuto = mode === 'auto';

      if (isAuto) {
        setAutoSaving(true);
      } else {
        setSaving(true);
        setSaveFeedback(null);
      }

      setError(null);

      try {
        const trimmedHome = form.team.trim();
        const trimmedAway = form.opponentTeam.trim();
        const rowsForPayload = gameRows.map((row) => ({
          ...row,
          homeTeam: trimmedHome,
          awayTeam: trimmedAway,
        }));

        const payloadPlayer = {
          rounds: rowsForPayload,
          finalized:
            mode === 'finalize' ? true : mode === 'unfinalize' ? false : isFinalized,
          totals: { home: totals.homeTotal, away: totals.awayTotal },
        };

        const payload = {
          team: trimmedHome,
          opponentTeam: trimmedAway,
          player: JSON.stringify(payloadPlayer),
          opponentPlayer: '',
          deck: '',
          opponentDeck: '',
          tournamentId: tournament?.id,
          selfScore:
            mode === 'finalize'
              ? totals.homeTotal.toString()
              : mode === 'unfinalize'
              ? ''
              : persistedScores.home,
          opponentScore:
            mode === 'finalize'
              ? totals.awayTotal.toString()
              : mode === 'unfinalize'
              ? ''
              : persistedScores.away,
          date: form.date ? form.date : null,
        };

        const response = await authFetch(`/api/matches/${matchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        const updated: MatchRecord = await response.json();

        if (isAuto) {
          setLastSavedSnapshot(snapshotValue);
          setLastSavedAt(new Date());
          setIsFinalized(false);
          setPersistedScores({ home: '', away: '' });
        } else {
          const updatedFormState: MatchFormValues = {
            team: updated.team ?? '',
            opponentTeam: updated.opponentTeam ?? '',
            date: updated.date ? updated.date.slice(0, 10) : '',
          };

          let updatedRows: GameRow[] = rowsForPayload;
          let parsedFinalized = mode === 'finalize';
          let parsedTotals = { home: totals.homeTotal, away: totals.awayTotal };

          try {
            const parsed = updated.player ? JSON.parse(updated.player) : [];
            if (Array.isArray(parsed)) {
              updatedRows = parsed.map((row: any) => ({
                id: typeof row.id === 'string' ? row.id : generateId(),
                homeTeam: row.homeTeam ?? (updated.team ?? ''),
                homePlayer: row.homePlayer ?? '',
                homeDeck: row.homeDeck ?? '',
                homeScore: row.homeScore ?? '',
                awayTeam: row.awayTeam ?? (updated.opponentTeam ?? ''),
                awayPlayer: row.awayPlayer ?? '',
                awayDeck: row.awayDeck ?? '',
                awayScore: row.awayScore ?? '',
              }));
              parsedFinalized = false;
              parsedTotals = { home: totals.homeTotal, away: totals.awayTotal };
              setPersistedScores({ home: '', away: '' });
            } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rounds)) {
              updatedRows = parsed.rounds.map((row: any) => ({
                id: typeof row.id === 'string' ? row.id : generateId(),
                homeTeam: row.homeTeam ?? (updated.team ?? ''),
                homePlayer: row.homePlayer ?? '',
                homeDeck: row.homeDeck ?? '',
                homeScore: row.homeScore ?? '',
                awayTeam: row.awayTeam ?? (updated.opponentTeam ?? ''),
                awayPlayer: row.awayPlayer ?? '',
                awayDeck: row.awayDeck ?? '',
                awayScore: row.awayScore ?? '',
              }));
              parsedFinalized = Boolean(parsed.finalized);
              if (parsed.totals) {
                parsedTotals = {
                  home: Number(parsed.totals.home ?? totals.homeTotal),
                  away: Number(parsed.totals.away ?? totals.awayTotal),
                };
              }
            }
          } catch {
            // ignore parse errors and keep current rows
          }

          setForm(updatedFormState);
          setGameRows(updatedRows);
          const serverSnapshot = makeSnapshot(updatedFormState, updatedRows);
          setLastSavedSnapshot(serverSnapshot);
          setLastSavedAt(new Date());
          setInitialized(true);
          setIsFinalized(parsedFinalized);
          setPersistedScores(
            parsedFinalized
              ? {
                  home: String(parsedTotals.home ?? ''),
                  away: String(parsedTotals.away ?? ''),
                }
              : { home: '', away: '' }
          );

          if (mode === 'finalize') {
            setSaveFeedback(t('resultEntry.resultConfirmed'));
            onSaved();
          } else if (mode === 'unfinalize') {
            setSaveFeedback(t('resultEntry.resultUnconfirmed'));
            onSaved();
          }
        }
      } catch (err) {
        console.error('Error updating match:', err);
        setError(t('resultEntry.saveFailed'));
      } finally {
        if (isAuto) {
          setAutoSaving(false);
        } else {
          setSaving(false);
        }
      }
    },
    [
      matchId,
      gameRows,
      form.team,
      form.opponentTeam,
      form.date,
      totals.homeTotal,
      totals.awayTotal,
      makeSnapshot,
      onSaved,
      authFetch,
      isFinalized,
      persistedScores.home,
      persistedScores.away,
      t,
      tournament?.id,
    ]
  );

  useEffect(() => {
    if (!initialized || !matchId) return;
    if (isFinalized) return;
    if (autoSaving || saving) return;
    if (snapshot === lastSavedSnapshot) return;
    const timeout = setTimeout(() => {
      handleSave('auto', snapshot);
    }, 800);
    return () => clearTimeout(timeout);
  }, [initialized, matchId, snapshot, lastSavedSnapshot, autoSaving, saving, isFinalized, handleSave]);

  const disableInputs = !matchId || loading;
  const disableEditing = disableInputs || isFinalized;

  const saveStatusText = useMemo(() => {
    if (!matchId) return t('resultEntry.noMatchSelected');
    if (autoSaving || saving) return t('resultEntry.autoSaving');
    if (snapshot !== lastSavedSnapshot) return t('resultEntry.unsavedChanges');
    const base = isFinalized ? t('resultEntry.finalized') : t('resultEntry.autoSaved');
    if (lastSavedAt) {
      return `${base} ${new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(lastSavedAt)}`;
    }
    return base;
  }, [matchId, autoSaving, saving, snapshot, lastSavedSnapshot, lastSavedAt, isFinalized, t]);

  const openCreateRowModal = () => {
    setRowModalState({
      open: true,
      mode: 'create',
      draft: {
        ...emptyRow,
        id: generateId(),
        homeTeam: form.team,
        awayTeam: form.opponentTeam,
      },
    });
  };

  const openEditRowModal = (row: GameRow) => {
    setRowModalState({
      open: true,
      mode: 'edit',
      draft: { ...row },
    });
  };

  const closeRowModal = () => {
    setRowModalState((prev) => ({ ...prev, open: false }));
  };

  const handleRowSave = (row: GameRow) => {
    setSaveFeedback(null);
    const withTeams: GameRow = {
      ...row,
      homeTeam: form.team,
      awayTeam: form.opponentTeam,
    };
    setGameRows((prev) => {
      if (prev.some((item) => item.id === row.id)) {
        return prev.map((item) => (item.id === row.id ? withTeams : item));
      }
      return [...prev, withTeams];
    });
    setIsFinalized(false);
    setPersistedScores({ home: '', away: '' });
    closeRowModal();
  };

  const confirmDeleteRow = (id: string) => {
    setDeleteState({ open: true, targetId: id });
  };

  const handleDeleteRow = () => {
    if (deleteState.targetId) {
      setSaveFeedback(null);
      setGameRows((prev) => prev.filter((row) => row.id !== deleteState.targetId));
      setIsFinalized(false);
      setPersistedScores({ home: '', away: '' });
    }
    setDeleteState({ open: false });
  };

  const renderScoreBoard = () => (
    <Card
      style={{
        borderRadius: 16,
        boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
        border: '1px solid rgba(24, 32, 56, 0.08)',
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Flex justify="space-between" align="center">
          <Title level={4} style={{ margin: 0, color: '#1a1d2f' }}>
            {t('resultEntry.matchScore')}
          </Title>
          <Tag color={scoreStatusMeta.color} style={{ fontWeight: 700 }}>
            {scoreStatusLabel}
          </Tag>
        </Flex>
        <Flex
          align="center"
          justify="space-between"
          gap={32}
          style={{ flexWrap: 'wrap' }}
        >
          {renderTeamColumn(form.team, scoreStatusMeta.homeHighlight)}
          <Space direction="vertical" align="center" size="small" style={{ minWidth: 120 }}>
            <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.12em' }}>
              SCORE
            </Text>
            <Title level={1} style={{ margin: 0, fontWeight: 800, color: '#1a1d2f' }}>
              {totals.homeTotal}
              <Text type="secondary" style={{ fontSize: 24, margin: '0 8px' }}>
                -
              </Text>
              {totals.awayTotal}
            </Title>
            <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.16em' }}>
              VS
            </Text>
          </Space>
          {renderTeamColumn(form.opponentTeam, scoreStatusMeta.awayHighlight)}
        </Flex>
      </Space>
    </Card>
  );

  const renderTeamColumn = (teamName: string, highlight: boolean) => (
    <Space direction="vertical" align="center" size="small" style={{ flex: 1 }}>
      <Avatar
        size={48}
        style={{
          fontWeight: 700,
          fontSize: 18,
          backgroundColor: highlight ? '#0d1026' : '#f4f6fd',
          color: highlight ? '#fff' : '#4a5162',
        }}
      >
        {getInitial(teamName)}
      </Avatar>
      <Text
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: highlight ? '#0d1026' : '#4a5162',
          textAlign: 'center',
        }}
      >
        {teamName || t('resultEntry.teamNotSet')}
      </Text>
    </Space>
  );

  const columns: ColumnsType<GameRow> = [
    {
      title: '#',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: GameRow, index: number) => index + 1,
    },
    {
      title: t('resultEntry.team'),
      dataIndex: 'homeTeam',
      key: 'homeTeam',
      render: (text: string) => text || form.team || '—',
    },
    {
      title: t('resultEntry.player'),
      dataIndex: 'homePlayer',
      key: 'homePlayer',
      render: (text: string) => text || '—',
    },
    {
      title: t('resultEntry.deck'),
      dataIndex: 'homeDeck',
      key: 'homeDeck',
      render: (text: string) => text || '—',
    },
    {
      title: t('resultEntry.score'),
      dataIndex: 'homeScore',
      key: 'homeScore',
      width: 80,
      align: 'center',
      render: (text: string) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: t('resultEntry.score'),
      dataIndex: 'awayScore',
      key: 'awayScore',
      width: 80,
      align: 'center',
      render: (text: string) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: t('resultEntry.deck'),
      dataIndex: 'awayDeck',
      key: 'awayDeck',
      render: (text: string) => text || '—',
    },
    {
      title: t('resultEntry.player'),
      dataIndex: 'awayPlayer',
      key: 'awayPlayer',
      render: (text: string) => text || '—',
    },
    {
      title: t('resultEntry.team'),
      dataIndex: 'awayTeam',
      key: 'awayTeam',
      render: (text: string) => text || form.opponentTeam || '—',
    },
    {
      title: t('resultEntry.actions'),
      key: 'actions',
      width: 180,
      align: 'right',
      render: (_: any, record: GameRow) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditRowModal(record)}
            disabled={disableEditing}
          >
            {t('resultEntry.edit')}
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDeleteRow(record.id)}
            disabled={disableEditing}
          >
            {t('resultEntry.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  const renderForm = () => (
    <Card
      style={{
        borderRadius: 16,
        boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
        border: '1px solid rgba(24, 32, 56, 0.08)',
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="vertical" size="small">
          <Title level={4} style={{ margin: 0, color: '#1a1d2f' }}>
            {t('resultEntry.roundList')}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('resultEntry.roundListDescription')}
          </Text>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Flex justify="space-between" align="center">
            <Title level={5} style={{ margin: 0, color: '#1a1d2f' }}>
              {t('resultEntry.matchDetails')}
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateRowModal}
              disabled={disableEditing}
              style={{
                borderRadius: 999,
                fontWeight: 700,
                backgroundColor: '#0d1026',
              }}
            >
              {t('resultEntry.addRound')}
            </Button>
          </Flex>
          <Table
            columns={columns}
            dataSource={gameRows}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{
              emptyText: (
                <div style={{ padding: '32px 0', color: '#7e8494' }}>
                  {t('resultEntry.noRoundsMessage')}
                </div>
              ),
            }}
          />
        </Space>
        <Flex justify="flex-end" align="center" gap={16}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {saveStatusText}
          </Text>
          {isFinalized ? (
            <Button
              icon={<SaveOutlined />}
              onClick={() => handleSave('unfinalize', snapshot)}
              disabled={saving || autoSaving || disableInputs}
              style={{ borderRadius: 999, fontWeight: 700 }}
            >
              {saving ? t('resultEntry.unfinalizing') : t('resultEntry.unfinalizeResult')}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave('finalize', snapshot)}
              disabled={saving || autoSaving || disableInputs}
              style={{
                borderRadius: 999,
                fontWeight: 700,
                backgroundColor: '#0d1026',
              }}
            >
              {saving ? t('resultEntry.finalizing') : t('resultEntry.finalizeResult')}
            </Button>
          )}
        </Flex>
      </Space>
    </Card>
  );

  const renderContent = () => {
    if (!matchId) {
      return (
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
            border: '1px solid rgba(24, 32, 56, 0.08)',
            textAlign: 'center',
            padding: '32px 16px',
          }}
        >
          <Title level={5} style={{ fontWeight: 700, color: '#2f3645', marginBottom: 8 }}>
            {t('resultEntry.selectMatchPrompt')}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('resultEntry.selectMatchDescription')}
          </Text>
        </Card>
      );
    }

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0' }}>
          <Spin size="large" />
        </div>
      );
    }

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {renderScoreBoard()}
        {error && <Alert message={error} type="error" showIcon />}
        {saveFeedback && <Alert message={saveFeedback} type="success" showIcon />}
        {renderForm()}
      </Space>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f6f7fb',
        padding: '48px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <Card
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 16,
            boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
            border: '1px solid rgba(24, 32, 56, 0.06)',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <Space direction="vertical" size="small">
            <Title
              level={3}
              style={{
                margin: 0,
                fontWeight: 800,
                color: '#ff8c3d',
                letterSpacing: 1,
              }}
            >
              {t('resultEntry.title')}
            </Title>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('resultEntry.description')}
            </Text>
          </Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{
              borderRadius: 999,
              padding: '8px 24px',
              fontWeight: 700,
              height: 'auto',
            }}
          >
            {t('resultEntry.backToMatchList')}
          </Button>
        </Card>
        {renderContent()}
      </div>
      <GameRowModal
        open={rowModalState.open}
        mode={rowModalState.mode}
        draft={rowModalState.draft}
        homeTeam={form.team}
        awayTeam={form.opponentTeam}
        onClose={closeRowModal}
        onSave={handleRowSave}
      />
      <Modal
        open={deleteState.open}
        title={t('resultEntry.deleteRoundTitle')}
        onCancel={() => setDeleteState({ open: false })}
        onOk={handleDeleteRow}
        okText={t('resultEntry.delete')}
        cancelText={t('resultEntry.cancel')}
        okButtonProps={{ danger: true }}
      >
        <Text>{t('resultEntry.deleteRoundConfirm')}</Text>
      </Modal>
    </div>
  );
};

type GameRowModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  draft: GameRow;
  homeTeam: string;
  awayTeam: string;
  onClose: () => void;
  onSave: (row: GameRow) => void;
};

const GameRowModal: React.FC<GameRowModalProps> = ({
  open,
  mode,
  draft,
  homeTeam,
  awayTeam,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<GameRow>(draft);

  useEffect(() => {
    setValues((prev) => ({
      ...draft,
      homeTeam,
      awayTeam,
    }));
  }, [draft, homeTeam, awayTeam]);

  const handleChange = (field: keyof GameRow) => (value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: typeof value === 'object' && value?.target ? value.target.value : value,
    }));
  };

  const handleSubmit = () => {
    onSave(values);
  };

  return (
    <Modal
      open={open}
      title={
        mode === 'create'
          ? t('resultEntry.addRoundTitle')
          : t('resultEntry.editRoundTitle')
      }
      onCancel={onClose}
      onOk={handleSubmit}
      okText={mode === 'create' ? t('resultEntry.add') : t('resultEntry.save')}
      cancelText={t('resultEntry.cancel')}
      width={600}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('resultEntry.roundModalDescription')}
        </Text>
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
        >
          <Input
            placeholder={t('resultEntry.team')}
            value={homeTeam}
            disabled
            style={{ color: '#1a1d2f' }}
          />
          <Input
            placeholder={t('resultEntry.team')}
            value={awayTeam}
            disabled
            style={{ color: '#1a1d2f' }}
          />
          <Input
            placeholder={t('resultEntry.player')}
            value={values.homePlayer}
            onChange={handleChange('homePlayer')}
          />
          <Input
            placeholder={t('resultEntry.player')}
            value={values.awayPlayer}
            onChange={handleChange('awayPlayer')}
          />
          <Input
            placeholder={t('resultEntry.deck')}
            value={values.homeDeck}
            onChange={handleChange('homeDeck')}
          />
          <Input
            placeholder={t('resultEntry.deck')}
            value={values.awayDeck}
            onChange={handleChange('awayDeck')}
          />
          <InputNumber
            placeholder={t('resultEntry.score')}
            value={values.homeScore}
            onChange={(value) => handleChange('homeScore')(String(value ?? ''))}
            min="0"
            style={{ width: '100%' }}
          />
          <InputNumber
            placeholder={t('resultEntry.score')}
            value={values.awayScore}
            onChange={(value) => handleChange('awayScore')(String(value ?? ''))}
            min="0"
            style={{ width: '100%' }}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default ResultEntry;
