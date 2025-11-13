import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Flex,
  Input,
  Modal,
  Select,
  Segmented,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UnlockOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';
import MatchCreateDialog from './components/MatchCreateDialog';
import { MatchRecord, DisplayMatch, CardStatus, MatchStats, formatDate, getInitial, parseScoreValue, determineStatus, statusMeta, toTimestamp } from './types/matchTypes';

const { Title, Text, Paragraph } = Typography;

interface Team {
  id: string;
  name: string;
}

type MatchManagerProps = {
  tournament: Tournament;
  onOpenResultEntry: (matchId: string) => void;
  reloadToken: number;
};

type Round = {
  id: string;
  tournament_id: string;
  number: number;
  title?: string | null;
  status: 'open' | 'closed';
  created_at: string;
  closed_at?: string | null;
};

const MatchManager: React.FC<MatchManagerProps> = ({ tournament, onOpenResultEntry, reloadToken }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [matchDialog, setMatchDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; match: MatchRecord | null }>(
    { open: false, mode: 'create', match: null },
  );
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = useState<boolean>(true);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundDialogOpen, setRoundDialogOpen] = useState<boolean>(false);
  const [roundDialogError, setRoundDialogError] = useState<string | null>(null);
  const [roundTitle, setRoundTitle] = useState<string>('');
  const [roundSubmitting, setRoundSubmitting] = useState<boolean>(false);
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [permDialog, setPermDialog] = useState<{ open: boolean; matchId: string | null; value: string; eligibleTeamIds: string[] }>(
    { open: false, matchId: null, value: 'none', eligibleTeamIds: [] },
  );
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const authFetch = useAuthorizedFetch();

  const fetchTeams = useCallback(async () => {
    if (!tournament?.id) {
      setError(t('teamManagement.tournamentSlugRequired'));
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournament.id);
      const response = await authFetch(`/api/teams?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('matchManager.fetchTeamsError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setError(err.message || t('matchManager.fetchTeamsError'));
    }
  }, [authFetch, t, tournament?.id]);

  const loadRounds = useCallback(async () => {
    setRoundsLoading(true);
    setRoundError(null);
    try {
      const response = await authFetch(`/api/tournaments/${tournament.id}/rounds`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      const data: Round[] = await response.json();
      setRounds(data);
      setSelectedRoundId((prev) => {
        if (prev && data.some((round) => round.id === prev)) {
          return prev;
        }
        const openRound = [...data].reverse().find((round) => round.status !== 'closed');
        const fallback = data.length > 0 ? data[data.length - 1] : null;
        return (openRound ?? fallback)?.id ?? null;
      });
    } catch (err) {
      console.error('Failed to load rounds:', err);
      setRoundError(t('matchManager.fetchRoundsFailed'));
    } finally {
      setRoundsLoading(false);
    }
  }, [authFetch, tournament.id, t]);

  const loadMatches = useCallback(async () => {
    if (!selectedRoundId) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournamentId', tournament.id);
      if (selectedRoundId) {
        params.set('roundId', selectedRoundId);
      }
      const response = await authFetch(`/api/matches?${params.toString()}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(
          bodyText ? `HTTP ${response.status}: ${bodyText.slice(0, 200)}` : `HTTP ${response.status}`,
        );
      }
      if (!contentType.includes('application/json')) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(
          bodyText
            ? `unexpected response format: ${bodyText.slice(0, 200)}`
            : 'unexpected response format',
        );
      }
      const data: MatchRecord[] = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(t('matchManager.fetchMatchesFailed'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedRoundId, tournament.id, t]);

  useEffect(() => {
    setSelectedRoundId(null);
    setMatches([]);
    setRoundFeedback(null);
    loadRounds();
    fetchTeams();
  }, [loadRounds, fetchTeams, tournament.id]);

  useEffect(() => {
    if (!selectedRoundId) {
      setMatches([]);
      return;
    }
    loadMatches();
  }, [loadMatches, reloadToken, selectedRoundId]);

  const displayMatches = useMemo<DisplayMatch[]>(() => {
    const teamMap = new Map(teams.map(team => [team.id, team.name]));

    const normalizeName = (value?: string | null) => {
      if (!value) {
        return t('matchManager.teamNotSet');
      }
      const teamName = teamMap.get(value);
      return teamName ?? t('matchManager.teamNotSet');
    };

    return matches
      .map<DisplayMatch>((match) => {
        const homeTeam = normalizeName(match.team);
        const awayTeam = normalizeName(match.opponentTeam);
        let homeScore = parseScoreValue(match.selfScore);
        let awayScore = parseScoreValue(match.opponentScore);
        let status: CardStatus = determineStatus(homeScore, awayScore);

        try {
          if (match.player) {
            const parsed = JSON.parse(match.player);
            const accumulate = (rounds: any[]) => {
              let derivedHome = 0;
              let derivedAway = 0;
              let pendingRounds = 0;
              rounds.forEach((row: any) => {
                const rowHome = parseScoreValue(row.homeScore);
                const rowAway = parseScoreValue(row.awayScore);
                if (rowHome === null || rowAway === null) {
                  pendingRounds += 1;
                  return;
                }
                derivedHome += rowHome;
                derivedAway += rowAway;
              });
              return { derivedHome, derivedAway, pendingRounds };
            };

            if (Array.isArray(parsed) && parsed.length > 0) {
              const { derivedHome, derivedAway, pendingRounds } = accumulate(parsed);
              if (pendingRounds === 0) {
                homeScore = derivedHome;
                awayScore = derivedAway;
                status = determineStatus(homeScore, awayScore);
              } else {
                homeScore = null;
                awayScore = null;
                status = 'pending';
              }
            } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rounds)) {
              const { derivedHome, derivedAway, pendingRounds } = accumulate(parsed.rounds);
              const isFinalized = Boolean(parsed.finalized);
              if (isFinalized && pendingRounds === 0) {
                homeScore = derivedHome;
                awayScore = derivedAway;
                status = determineStatus(homeScore, awayScore);
              } else {
                homeScore = null;
                awayScore = null;
                status = 'pending';
              }
            }
          }
        } catch {
          // ignore parsing errors and fall back to raw values
        }

        const timestamp = Math.max(toTimestamp(match.date), toTimestamp(match.created_at));

        return {
          id: match.id,
          homeTeam,
          awayTeam,
          date: match.date ?? null,
          timestamp,
          homeScore,
          awayScore,
          status,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [matches, teams, t]);

  const stats = useMemo<MatchStats>(() => {
    const teams = new Set<string>();
    let completed = 0;
    let pending = 0;

    displayMatches.forEach((match) => {
      teams.add(match.homeTeam);
      teams.add(match.awayTeam);
      if (match.status === 'pending') {
        pending += 1;
      } else {
        completed += 1;
      }
    });

    return {
      total: displayMatches.length,
      completed,
      pending,
      teamCount: teams.size,
    };
  }, [displayMatches]);

  const selectedRound = useMemo(
    () => rounds.find((round) => round.id === selectedRoundId) ?? null,
    [rounds, selectedRoundId],
  );

  const canCreateMatch = Boolean(selectedRound && selectedRound.status !== 'closed');

  const permDialogTeams = useMemo(() => {
    if (!permDialog.eligibleTeamIds.length) {
      return [];
    }
    const eligibleSet = new Set(permDialog.eligibleTeamIds);
    return teams.filter((team) => eligibleSet.has(team.id));
  }, [permDialog.eligibleTeamIds, teams]);

  const roundStatusChip = useMemo(() => {
    if (!selectedRound) return null;
    if (selectedRound.status === 'closed') {
      return <Tag color="default" style={{ fontWeight: 700 }}>{t('matchManager.closed')}</Tag>;
    }
    return <Tag color="success" style={{ fontWeight: 700 }}>{t('matchManager.inProgress')}</Tag>;
  }, [selectedRound, t]);

  const latestRoundNumber = useMemo(
    () => rounds.reduce((max, round) => Math.max(max, round.number), 0),
    [rounds],
  );

  const canReopenRound = Boolean(
    selectedRound &&
      selectedRound.status === 'closed' &&
      selectedRound.number === latestRoundNumber &&
      !roundSubmitting,
  );

  const handleMatchDialogCompleted = (mode: 'create' | 'edit') => {
    setMatchDialog({ open: false, mode: 'create', match: null });
    setRoundFeedback(mode === 'create' ? t('matchManager.matchAdded') : t('matchManager.matchUpdated'));
    loadMatches();
  };

  const handleMatchDialogClosed = () => {
    setMatchDialog({ open: false, mode: 'create', match: null });
  };

  useEffect(() => {
    setRoundFeedback(null);
  }, [selectedRoundId]);

  const handleOpenCreateMatch = () => {
    if (!canCreateMatch) {
      return;
    }
    setMatchDialog({ open: true, mode: 'create', match: null });
  };

  const handleOpenEditMatch = (match: MatchRecord) => {
    setMatchDialog({ open: true, mode: 'edit', match });
  };

  const handleConfirmDeleteMatch = (match: MatchRecord) => {
    setDeleteTarget(match);
    setDeleteError(null);
  };

  const handleDeleteMatch = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const response = await authFetch(`/api/matches/${deleteTarget.id}`, { method: 'DELETE' });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      await loadMatches();
      setRoundFeedback(t('matchManager.matchDeleted'));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete match:', err);
      setDeleteError(err instanceof Error ? err.message : t('matchManager.deleteMatchFailed'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedRound) {
      window.localStorage.setItem('katorin:selectedRoundId', selectedRound.id);
      window.localStorage.setItem('katorin:selectedRoundNumber', String(selectedRound.number));
      window.dispatchEvent(new CustomEvent('katorin:roundChanged', { detail: selectedRound }));
    } else {
      window.localStorage.removeItem('katorin:selectedRoundId');
      window.localStorage.removeItem('katorin:selectedRoundNumber');
      window.dispatchEvent(new CustomEvent('katorin:roundCleared'));
    }
  }, [selectedRound]);

  const handleCreateRound = async () => {
    if (roundSubmitting) return;
    setRoundSubmitting(true);
    setRoundDialogError(null);
    try {
      const response = await authFetch(`/api/tournaments/${tournament.id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: roundTitle.trim().length > 0 ? roundTitle.trim() : undefined,
        }),
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      const newRound: Round = await response.json();
      await loadRounds();
      setSelectedRoundId(newRound.id);
      setRoundFeedback(t('matchManager.roundCreated', { number: newRound.number }));
      setRoundDialogOpen(false);
      setRoundTitle('');
      setRoundDialogError(null);
    } catch (err) {
      console.error('Failed to create round:', err);
      setRoundDialogError(t('matchManager.createRoundFailed'));
    } finally {
      setRoundSubmitting(false);
    }
  };

  const handleCloseRound = async () => {
    if (!selectedRound || selectedRound.status === 'closed') {
      return;
    }
    const closingRound = selectedRound;
    setRoundSubmitting(true);
    setRoundFeedback(null);
    try {
      const response = await authFetch(
        `/api/tournaments/${tournament.id}/rounds/${closingRound.id}/close`,
        { method: 'POST' },
      );
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      await loadRounds();
      setRoundFeedback(t('matchManager.roundClosed', { number: closingRound.number }));
    } catch (err) {
      console.error('Failed to close round:', err);
      setRoundFeedback(t('matchManager.closeRoundFailed'));
    } finally {
      setRoundSubmitting(false);
    }
  };

  const handleReopenRound = async () => {
    if (!selectedRound || selectedRound.status !== 'closed') {
      return;
    }
    const reopeningRound = selectedRound;
    setRoundSubmitting(true);
    setRoundFeedback(null);
    try {
      const response = await authFetch(
        `/api/tournaments/${tournament.id}/rounds/${reopeningRound.id}/reopen`,
        { method: 'POST' },
      );
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      await loadRounds();
      setRoundFeedback(t('matchManager.roundReopened', { number: reopeningRound.number }));
    } catch (err) {
      console.error('Failed to reopen round:', err);
      setRoundFeedback(t('matchManager.reopenRoundFailed'));
    } finally {
      setRoundSubmitting(false);
    }
  };
  const renderStatsChips = () => (
    <Space wrap>
      <Tag color="#0d1026" style={{ fontWeight: 700, color: '#fff' }}>
        {t('matchManager.totalMatches', { count: stats.total })}
      </Tag>
      <Tag color="success" style={{ fontWeight: 700 }}>
        {t('matchManager.completed', { count: stats.completed })}
      </Tag>
      <Tag color="warning" style={{ fontWeight: 700 }}>
        {t('matchManager.pending', { count: stats.pending })}
      </Tag>
      <Tag color="default" style={{ fontWeight: 700 }}>
        {t('matchManager.registeredTeams', { count: stats.teamCount })}
      </Tag>
    </Space>
  );

  const renderRoundControls = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {roundFeedback && (
        <Alert
          type="success"
          message={roundFeedback}
          closable
          onClose={() => setRoundFeedback(null)}
        />
      )}
      {roundError && (
        <Alert
          type="error"
          message={roundError}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={loadRounds}>
              {t('matchManager.reload')}
            </Button>
          }
        />
      )}
      {roundsLoading ? (
        <Flex vertical align="center" gap={12} style={{ padding: '32px 0' }}>
          <Spin size="large" />
          <Text type="secondary">{t('matchManager.loadingRounds')}</Text>
        </Flex>
      ) : rounds.length === 0 ? (
        <Card
          style={{
            textAlign: 'center',
            borderStyle: 'dashed',
            borderRadius: 16,
          }}
        >
          <Title level={5}>{t('matchManager.noRoundsYet')}</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            {t('matchManager.createFirstRoundPrompt')}
          </Paragraph>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{ borderRadius: 999 }}
            onClick={() => {
              setRoundTitle('');
              setRoundDialogError(null);
              setRoundDialogOpen(true);
            }}
          >
            {t('matchManager.createFirstRound')}
          </Button>
        </Card>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Flex wrap="wrap" gap={16} justify="space-between" align="center">
            <Segmented
              value={selectedRoundId}
              onChange={(value) => setSelectedRoundId(value as string)}
              options={rounds.map((round) => ({
                label: (
                  <Flex vertical align="center" style={{ padding: '8px 16px' }}>
                    <Text strong>{t('matchManager.roundNumber', { number: round.number })}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {round.status === 'closed' ? t('matchManager.closed') : t('matchManager.inProgress')}
                    </Text>
                  </Flex>
                ),
                value: round.id,
              }))}
              style={{ flexWrap: 'wrap' }}
            />
            <Space>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  setRoundTitle('');
                  setRoundDialogError(null);
                  setRoundDialogOpen(true);
                }}
                disabled={roundSubmitting}
              >
                {t('matchManager.createNewRound')}
              </Button>
              {selectedRound && selectedRound.status === 'closed' ? (
                <Button
                  type="primary"
                  icon={<UndoOutlined />}
                  onClick={handleReopenRound}
                  disabled={!canReopenRound}
                >
                  {t('matchManager.reopenThisRound')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  danger
                  onClick={handleCloseRound}
                  disabled={!selectedRound || roundSubmitting}
                >
                  {t('matchManager.closeThisRound')}
                </Button>
              )}
            </Space>
          </Flex>
          {selectedRound && (
            <Flex gap={8} align="center">
              <Text strong>
                {t('matchManager.roundNumber', { number: selectedRound.number })}
                {selectedRound.title ? `｜${selectedRound.title}` : ''}
              </Text>
              {roundStatusChip}
            </Flex>
          )}
          {selectedRound && selectedRound.status === 'closed' && (
            <Alert
              type="info"
              message={
                canReopenRound
                  ? t('matchManager.roundClosedCanReopen')
                  : t('matchManager.roundClosedCannotReopen')
              }
            />
          )}
        </Space>
      )}
    </Space>
  );

  const renderMatchCard = (match: DisplayMatch) => {
    const homeInitial = getInitial(match.homeTeam);
    const awayInitial = getInitial(match.awayTeam);
    const homeScoreDisplay = match.status === 'pending' ? '-' : match.homeScore;
    const awayScoreDisplay = match.status === 'pending' ? '-' : match.awayScore;
    const info = statusMeta[match.status](match);

    const isHomeWinner = match.status === 'homeWin';
    const isAwayWinner = match.status === 'awayWin';
    const isPending = match.status === 'pending';
    const isDraw = match.status === 'draw';

    const renderTeamColumn = (teamName: string, initial: string, highlight: boolean) => (
      <Flex vertical gap={8} align="center" style={{ flex: 1 }}>
        <Avatar
          size={40}
          style={{
            fontWeight: 700,
            fontSize: 16,
            backgroundColor: highlight ? '#0d1026' : '#f4f6fd',
            color: highlight ? '#fff' : '#4a5162',
          }}
        >
          {initial}
        </Avatar>
        <Text
          strong
          style={{
            fontSize: 15,
            color: highlight ? '#0d1026' : '#4a5162',
            textAlign: 'center',
          }}
        >
          {teamName}
        </Text>
        {highlight && match.status !== 'pending' && match.status !== 'draw' && (
          <Tag color="#0d1026" style={{ fontWeight: 700, color: '#fff' }}>
            WIN
          </Tag>
        )}
        {isDraw && (
          <Tag color="default" style={{ fontWeight: 700 }}>
            DRAW
          </Tag>
        )}
        {isPending && (
          <Tag style={{ fontWeight: 600 }}>
            {t('matchManager.awaitingResult')}
          </Tag>
        )}
      </Flex>
    );

    return (
      <Card
        key={match.id}
        style={{
          borderRadius: 16,
          boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Flex justify="space-between" align="center" gap={16}>
            <Space style={{ color: '#7e8494' }}>
              <CalendarOutlined style={{ fontSize: 16 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                {formatDate(match.date)}
              </Text>
            </Space>
            <Space>
              <Tag
                color={info.bgcolor}
                style={{ color: info.color, fontWeight: 700 }}
              >
                {info.label}
              </Tag>
              <Tooltip title={t('matchManager.setInputPermission')}>
                <Button
                  type="text"
                  size="small"
                  icon={<UnlockOutlined />}
                  onClick={() => {
                    const raw = matches.find((m) => m.id === match.id);
                    const current = raw?.input_allowed_team_id ?? null;
                    const eligibleTeamIds = Array.from(
                      new Set(
                        [raw?.team, raw?.opponentTeam].filter(
                          (teamId): teamId is string => Boolean(teamId),
                        ),
                      ),
                    );
                    let nextValue: string = 'none';
                    if (current === 'admin') {
                      nextValue = 'admin';
                    } else if (current && eligibleTeamIds.includes(current)) {
                      nextValue = current;
                    }
                    setPermError(null);
                    setPermDialog({
                      open: true,
                      matchId: match.id,
                      value: nextValue,
                      eligibleTeamIds,
                    });
                  }}
                  disabled={!canCreateMatch}
                />
              </Tooltip>
              <Tooltip title={t('matchManager.editMatch')}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEditMatch(match)}
                  disabled={!canCreateMatch}
                />
              </Tooltip>
              <Tooltip title={t('matchManager.deleteMatch')}>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => handleConfirmDeleteMatch(match)}
                  disabled={!canCreateMatch}
                />
              </Tooltip>
            </Space>
          </Flex>
          <Flex justify="space-between" align="center" gap={24}>
            {renderTeamColumn(match.homeTeam, homeInitial, isHomeWinner)}
            <Flex vertical gap={4} align="center" style={{ minWidth: 96 }}>
              <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.12em' }}>
                SCORE
              </Text>
              <Text
                strong
                style={{ fontSize: 30, fontWeight: 800, color: '#1a1d2f' }}
              >
                {homeScoreDisplay}
                <Text type="secondary" style={{ margin: '0 8px', fontSize: 22 }}>
                  -
                </Text>
                {awayScoreDisplay}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.16em' }}>
                VS
              </Text>
            </Flex>
            {renderTeamColumn(match.awayTeam, awayInitial, isAwayWinner)}
          </Flex>
          <Flex justify="flex-end">
            <Button
              style={{ borderRadius: 999 }}
              onClick={() => onOpenResultEntry(match.id)}
            >
              {t('matchManager.toResultEntry')}
            </Button>
          </Flex>
        </Space>
      </Card>
    );
  };

  const renderMatchList = () => {
    if (loading) {
      return (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin size="large" />
        </Flex>
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          message={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={loadMatches}>
              {t('matchManager.reload')}
            </Button>
          }
        />
      );
    }

    if (displayMatches.length === 0) {
      return (
        <Card
          style={{
            textAlign: 'center',
            borderStyle: 'dashed',
            borderRadius: 16,
          }}
        >
          <Title level={5}>{t('matchManager.noMatchesYet')}</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            {t('matchManager.createMatchPrompt')}
          </Paragraph>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{ borderRadius: 999 }}
            onClick={handleOpenCreateMatch}
            disabled={!canCreateMatch}
          >
            {t('matchManager.createMatch')}
          </Button>
        </Card>
      );
    }

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {displayMatches.map(renderMatchCard)}
      </Space>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f6f7fb',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={2} style={{ color: '#ff8c3d', marginBottom: 0 }}>
                {t('matchManager.title')}
              </Title>
              <Text type="secondary" style={{ fontWeight: 600 }}>
                {t('matchManager.description')}
              </Text>
            </Space>
          </Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {renderRoundControls()}
            <Flex
              wrap="wrap"
              justify="space-between"
              align="center"
              gap={16}
            >
              <Space direction="vertical" size={4}>
                <Title level={4} style={{ margin: 0 }}>
                  {t('matchManager.matchCardList')}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t('matchManager.matchCardListDescription')}
                </Text>
              </Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                style={{ borderRadius: 999 }}
                onClick={handleOpenCreateMatch}
                disabled={!canCreateMatch}
              >
                {t('matchManager.createMatch')}
              </Button>
            </Flex>
            {renderStatsChips()}
          </Space>
          {renderMatchList()}
        </Space>
      </div>
      <MatchCreateDialog
        open={matchDialog.open}
        mode={matchDialog.mode}
        match={matchDialog.match}
        onClose={handleMatchDialogClosed}
        onCompleted={handleMatchDialogCompleted}
        tournamentId={tournament.id}
        roundId={selectedRound?.id ?? null}
      />
      {/* 入力権限設定モーダル */}
      <Modal
        title={t('matchManager.inputPermissionTitle')}
        open={permDialog.open}
        onCancel={() =>
          !permSaving ? setPermDialog({ open: false, matchId: null, value: 'none', eligibleTeamIds: [] }) : null
        }
        onOk={async () => {
          if (!permDialog.matchId) return;
          setPermSaving(true);
          setPermError(null);
          try {
            const value = permDialog.value;
            const input_allowed_team_id = value === 'none' ? null : value;
            const response = await authFetch(`/api/matches/${permDialog.matchId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ input_allowed_team_id }),
            });
            const contentType = response.headers.get('content-type') ?? '';
            if (!response.ok) {
              const message = contentType.includes('application/json')
                ? (await response.json()).error ?? `HTTP ${response.status}`
                : await response.text();
              throw new Error(message || `HTTP ${response.status}`);
            }
            await loadMatches();
            setPermDialog({ open: false, matchId: null, value: 'none', eligibleTeamIds: [] });
          } catch (err: any) {
            console.error('Failed to update input permission:', err);
            setPermError(err?.message || t('matchManager.updatePermissionFailed'));
          } finally {
            setPermSaving(false);
          }
        }}
        okText={permSaving ? t('matchManager.saving') : t('matchManager.save')}
        cancelText={t('matchManager.cancel')}
        confirmLoading={permSaving}
        okButtonProps={{ disabled: !permDialog.matchId }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {permError && <Alert type="error" message={permError} />}
          <Text type="secondary">
            {t('matchManager.inputPermissionDescription')}
          </Text>
          <Select
            style={{ width: '100%' }}
            value={permDialog.value}
            onChange={(value) => setPermDialog((p) => ({ ...p, value }))}
            disabled={permSaving}
            options={[
              { value: 'none', label: t('matchManager.permissionNone') },
              { value: 'admin', label: t('matchManager.permissionAdmin') },
              ...(permDialogTeams.length > 0
                ? [
                    { value: '__sep__', label: '──────────', disabled: true },
                    ...permDialogTeams.map((team) => ({
                      value: team.id,
                      label: team.name,
                    })),
                  ]
                : []),
            ]}
          />
        </Space>
      </Modal>
      <Modal
        title={t('matchManager.createRound')}
        open={roundDialogOpen}
        onCancel={() => {
          if (!roundSubmitting) {
            setRoundDialogOpen(false);
            setRoundDialogError(null);
          }
        }}
        onOk={handleCreateRound}
        okText={roundSubmitting ? t('matchManager.creating') : t('matchManager.create')}
        cancelText={t('matchManager.cancel')}
        confirmLoading={roundSubmitting}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {roundDialogError && <Alert type="error" message={roundDialogError} />}
          <Text type="secondary">
            {t('matchManager.roundNameOptional')}
          </Text>
          <Input
            placeholder={t('matchManager.roundNamePlaceholder')}
            value={roundTitle}
            onChange={(e) => setRoundTitle(e.target.value)}
            disabled={roundSubmitting}
          />
        </Space>
      </Modal>
      <Modal
        title={t('matchManager.deleteMatchTitle')}
        open={Boolean(deleteTarget)}
        onCancel={handleCloseDeleteDialog}
        onOk={handleDeleteMatch}
        okText={deleteSubmitting ? t('matchManager.deleting') : t('matchManager.delete')}
        cancelText={t('matchManager.cancel')}
        okButtonProps={{ danger: true }}
        confirmLoading={deleteSubmitting}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {deleteError && <Alert type="error" message={deleteError} />}
          <Text>
            {t('matchManager.deleteMatchConfirmation')}
          </Text>
          {deleteTarget && (
            <Card style={{ backgroundColor: '#f9fafc' }}>
              <Text strong>
                {deleteTarget.team ?? t('matchManager.teamNotSet')} vs {deleteTarget.opponentTeam ?? t('matchManager.teamNotSet')}
              </Text>
              <br />
              <Text type="secondary">
                {formatDate(deleteTarget.date)}
              </Text>
            </Card>
          )}
        </Space>
      </Modal>
    </div>
  );
};



export default MatchManager;
