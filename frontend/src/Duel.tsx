import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Typography, Table, Flex } from 'antd';
import { DuelForm } from './duelDefaults';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
type RosterEntry = {
  primary: string;
  secondary: string;
};

type MatchEntry = {
  leftPlayer: string;
  leftDeck: string;
  score: string;
  rightDeck: string;
  rightPlayer: string;
};

const parseRoster = (raw: string): RosterEntry[] =>
  raw
    .split('\n')
    .map((line) => {
      const [primary = '', secondary = ''] = line.split(',').map((part) => part.trim());
      return { primary, secondary };
    })
    .filter((entry) => entry.primary || entry.secondary);

const parseMatches = (raw: string): MatchEntry[] =>
  raw.split('\n').map((line) => {
    if (line.trim().length === 0) {
      return {
        leftPlayer: '-',
        leftDeck: '-',
        score: '-',
        rightDeck: '-',
        rightPlayer: '-',
      };
    }
    const [leftPlayer = '-', leftDeck = '-', score = '-', rightDeck = '-', rightPlayer = '-'] = line
      .split(',')
      .map((part) => (part.trim().length === 0 ? '-' : part.trim()));
    return { leftPlayer, leftDeck, score, rightDeck, rightPlayer };
  });

type DuelProps = {
  form: DuelForm;
};

const Duel: React.FC<DuelProps> = ({ form }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const fallbackMatches = useMemo(() => parseMatches(form.matchesText), [form.matchesText]);
  const [matchRows, setMatchRows] = useState<MatchEntry[]>(fallbackMatches);
  const defaultTournamentId = process.env.REACT_APP_DEFAULT_TOURNAMENT_ID ?? null;
  const [tournamentId, setTournamentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return defaultTournamentId;
    }
    return window.localStorage.getItem('katorin:selectedTournamentId') ?? defaultTournamentId;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<Tournament | undefined>).detail;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        setTournamentId(detail.id as string);
      }
    };
    const handleClear = () => {
      setTournamentId(defaultTournamentId ?? null);
    };
    window.addEventListener('katorin:tournamentChanged', handleChange as EventListener);
    window.addEventListener('katorin:tournamentCleared', handleClear);
    return () => {
      window.removeEventListener('katorin:tournamentChanged', handleChange as EventListener);
      window.removeEventListener('katorin:tournamentCleared', handleClear);
    };
  }, [defaultTournamentId]);
  const displayDate = useMemo(() => {
    const [year, month, day] = form.date.split('-');
    if (year && month && day) {
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}/${paddedMonth}/${paddedDay}`;
    }
    return form.date;
  }, [form.date]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        if (!tournamentId) {
          setMatchRows(fallbackMatches);
          return;
        }
        const params = new URLSearchParams({ tournamentId });
        const response = await authFetch(`/api/matches?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: Array<{
          player?: string;
          deck?: string;
          selfScore?: string | number | null;
          opponentScore?: string | number | null;
          opponentDeck?: string;
          opponentPlayer?: string;
        }> = await response.json();
        const normalized = data.map<MatchEntry>((match) => {
          const leftPlayer = match.player?.trim() || '-';
          const leftDeck = match.deck?.trim() || '-';
          const rightPlayer = match.opponentPlayer?.trim() || '-';
          const rightDeck = match.opponentDeck?.trim() || '-';

          const leftScore = match.selfScore ?? '';
          const rightScore = match.opponentScore ?? '';
          const score =
            leftScore !== '' && rightScore !== ''
              ? `${leftScore} - ${rightScore}`
              : '-';

          return {
            leftPlayer,
            leftDeck,
            score,
            rightDeck,
            rightPlayer,
          };
        });
        setMatchRows(normalized.length > 0 ? normalized : fallbackMatches);
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();
  }, [authFetch, fallbackMatches, tournamentId]);

  const leftRoster = useMemo(() => parseRoster(form.leftRosterText), [form.leftRosterText]);
  const rightRoster = useMemo(() => parseRoster(form.rightRosterText), [form.rightRosterText]);
  const filteredMatchRows = useMemo(
    () =>
      matchRows.filter(
        (match) =>
          !(
            match.leftPlayer === '-' &&
            match.leftDeck === '-' &&
            match.score === '-' &&
            match.rightDeck === '-' &&
            match.rightPlayer === '-'
          )
      ),
    [matchRows]
  );
  const { leftWins, rightWins } = useMemo(() => {
    return filteredMatchRows.reduce(
      (acc, match) => {
        const [leftScoreRaw = '0', rightScoreRaw = '0'] = match.score.split('-').map((value) => value.trim());
        const leftScore = Number(leftScoreRaw);
        const rightScore = Number(rightScoreRaw);

        if (!Number.isNaN(leftScore) && !Number.isNaN(rightScore)) {
          if (leftScore > rightScore) {
            acc.leftWins += 1;
          } else if (rightScore > leftScore) {
            acc.rightWins += 1;
          }
        }

        return acc;
      },
      { leftWins: 0, rightWins: 0 }
    );
  }, [filteredMatchRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card
        style={{
          borderRadius: 12,
          padding: '24px 32px',
          background: 'linear-gradient(180deg, #efefef 0%, #d7d7d7 100%)',
          border: '4px solid #6f6f6f',
          color: '#0f0f0f',
          fontFamily: `'Segoe UI', 'Noto Sans JP', sans-serif`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        <Flex
          justify="space-between"
          align="center"
          style={{
            borderBottom: '4px solid #b3b3b3',
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                fontWeight: 800,
                letterSpacing: '0.12em',
                lineHeight: 1.1,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {form.title}
            </Title>
            <Text
              style={{
                fontWeight: 600,
                letterSpacing: '0.32em',
                color: '#1f3f92',
                fontSize: 16,
                display: 'block',
              }}
            >
              {form.subtitle}
            </Text>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 600, color: '#333' }}>
            <div style={{ fontSize: 18 }}>{form.stage}</div>
            <div style={{ fontSize: 16, marginTop: 4 }}>{displayDate}</div>
          </div>
        </Flex>

        <Row gutter={16} align="stretch">
          <Col xs={24} md={10}>
            <Card
              style={{
                height: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                border: '3px solid rgba(0,0,0,0.2)',
              }}
              bodyStyle={{ padding: 0 }}
            >
              <div
                style={{
                  backgroundColor: '#4b7edb',
                  color: '#fff',
                  padding: '12px 16px',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {form.leftTeamName}
              </div>
              <Table
                size="small"
                dataSource={leftRoster.map((entry, index) => ({
                  key: `left-${index}`,
                  primary: entry.primary || '-',
                }))}
                columns={[
                  {
                    dataIndex: 'primary',
                    key: 'primary',
                    render: (text) => (
                      <span style={{ fontWeight: 600, color: '#fff' }}>{text}</span>
                    ),
                  },
                ]}
                pagination={false}
                showHeader={false}
                style={{
                  backgroundColor: 'rgba(75, 126, 219, 0.86)',
                }}
                rowClassName="roster-row-left"
              />
            </Card>
          </Col>

          <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Title
              level={1}
              style={{
                fontWeight: 900,
                color: '#333',
                textShadow: '0 4px 6px rgba(0,0,0,0.25)',
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              {t('duel.vs')}
            </Title>
          </Col>

          <Col xs={24} md={10}>
            <Card
              style={{
                height: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                border: '3px solid rgba(0,0,0,0.2)',
              }}
              bodyStyle={{ padding: 0 }}
            >
              <div
                style={{
                  backgroundColor: '#c92f2f',
                  color: '#fff',
                  padding: '12px 16px',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {form.rightTeamName}
              </div>
              <Table
                size="small"
                dataSource={rightRoster.map((entry, index) => ({
                  key: `right-${index}`,
                  primary: entry.primary || '-',
                }))}
                columns={[
                  {
                    dataIndex: 'primary',
                    key: 'primary',
                    align: 'right' as const,
                    render: (text) => (
                      <span style={{ fontWeight: 600, color: '#fff' }}>{text}</span>
                    ),
                  },
                ]}
                pagination={false}
                showHeader={false}
                style={{
                  backgroundColor: 'rgba(201, 47, 47, 0.86)',
                }}
                rowClassName="roster-row-right"
              />
            </Card>
          </Col>
        </Row>

        <Card
          style={{
            marginTop: 24,
            borderRadius: 10,
            overflow: 'hidden',
            border: '3px solid #777',
            backgroundColor: '#d0d0d0',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            size="small"
            dataSource={filteredMatchRows.map((match, index) => ({
              key: `match-${index}`,
              leftPlayer: match.leftPlayer,
              leftDeck: match.leftDeck,
              score: match.score,
              rightDeck: match.rightDeck,
              rightPlayer: match.rightPlayer,
            }))}
            columns={[
              {
                title: t('duel.player'),
                dataIndex: 'leftPlayer',
                key: 'leftPlayer',
                align: 'center' as const,
                onCell: () => ({
                  style: {
                    backgroundColor: 'rgba(41,112,224,0.95)',
                    color: '#fff',
                    fontWeight: 700,
                  },
                }),
              },
              {
                title: t('duel.deck'),
                dataIndex: 'leftDeck',
                key: 'leftDeck',
                align: 'center' as const,
                onCell: () => ({
                  style: {
                    backgroundColor: 'rgba(41,112,224,0.95)',
                    color: '#fff',
                  },
                }),
              },
              {
                title: '',
                dataIndex: 'score',
                key: 'score',
                align: 'center' as const,
                onCell: () => ({
                  style: {
                    backgroundColor: '#f1f1f1',
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#272727',
                  },
                }),
              },
              {
                title: t('duel.deck'),
                dataIndex: 'rightDeck',
                key: 'rightDeck',
                align: 'center' as const,
                onCell: () => ({
                  style: {
                    backgroundColor: 'rgba(226,58,58,0.95)',
                    color: '#fff',
                  },
                }),
              },
              {
                title: t('duel.player'),
                dataIndex: 'rightPlayer',
                key: 'rightPlayer',
                align: 'center' as const,
                onCell: () => ({
                  style: {
                    backgroundColor: 'rgba(226,58,58,0.95)',
                    color: '#fff',
                    fontWeight: 700,
                  },
                }),
              },
            ]}
            pagination={false}
            className="match-table"
          />
          <div
            style={{
              backgroundColor: '#505050',
              color: '#fff',
              textAlign: 'center',
              padding: '10px 0',
              fontWeight: 700,
              letterSpacing: '0.3em',
            }}
          >
            {leftWins} - {rightWins}
          </div>
        </Card>

        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col xs={24} md={12}>
            <Card
              style={{
                backgroundColor: '#1a59d9',
                color: '#fff',
                borderRadius: 8,
                textAlign: 'center',
                padding: '16px 0',
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '0.3em',
                boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.25)',
                border: 'none',
              }}
              bodyStyle={{ padding: 0 }}
            >
              {form.winLabel}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              style={{
                backgroundColor: '#d12c2c',
                color: '#fff',
                borderRadius: 8,
                textAlign: 'center',
                padding: '16px 0',
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '0.3em',
                boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.25)',
                border: 'none',
              }}
              bodyStyle={{ padding: 0 }}
            >
              {form.loseLabel}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Duel;
