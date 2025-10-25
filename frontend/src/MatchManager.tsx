import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

type MatchRecord = {
  id: string;
  team?: string | null;
  player?: string | null;
  deck?: string | null;
  selfScore?: string | null;
  opponentScore?: string | null;
  opponentTeam?: string | null;
  opponentPlayer?: string | null;
  opponentDeck?: string | null;
  date?: string | null;
  created_at?: string | null;
};

type MatchFormValues = {
  team: string;
  opponentTeam: string;
  date: string;
};

type CardStatus = 'homeWin' | 'awayWin' | 'draw' | 'pending';

type DisplayMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  timestamp: number;
  homeScore: number | null;
  awayScore: number | null;
  status: CardStatus;
};

type MatchStats = {
  total: number;
  completed: number;
  pending: number;
  teamCount: number;
};

const createInitialValues = (): MatchFormValues => ({
  team: '',
  opponentTeam: '',
  date: '',
});

const formatDate = (value?: string | null) => {
  if (!value) {
    return '日付未設定';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const parseScoreValue = (value?: string | null): number | null => {
  if (value === null || value === undefined) return null;
  const trimmed = value.toString().trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const determineStatus = (homeScore: number | null, awayScore: number | null): CardStatus => {
  if (homeScore === null || awayScore === null) {
    return 'pending';
  }
  if (homeScore > awayScore) return 'homeWin';
  if (homeScore < awayScore) return 'awayWin';
  return 'draw';
};

const getInitial = (value?: string | null) => {
  if (!value) return '？';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : '？';
};

const statusMeta = {
  homeWin: (match: DisplayMatch) => ({
    label: `${match.homeTeam} 勝利`,
    bgcolor: '#e6f7ef',
    color: '#1f8a5d',
  }),
  awayWin: (match: DisplayMatch) => ({
    label: `${match.awayTeam} 勝利`,
    bgcolor: '#e6f7ef',
    color: '#1f8a5d',
  }),
  draw: () => ({
    label: '引き分け',
    bgcolor: '#e8ecf8',
    color: '#43506c',
  }),
  pending: () => ({
    label: '試合中',
    bgcolor: '#fff4e6',
    color: '#b66d1f',
  }),
} satisfies Record<CardStatus, (match: DisplayMatch) => { label: string; bgcolor: string; color: string }>;

type MatchManagerProps = {
  onOpenResultEntry: (matchId: string) => void;
  reloadToken: number;
};

const MatchManager: React.FC<MatchManagerProps> = ({ onOpenResultEntry, reloadToken }) => {
  const [view, setView] = useState<'matches' | 'participants'>('matches');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/matches');
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
      setError('対戦データの取得に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches, reloadToken]);

  const displayMatches = useMemo<DisplayMatch[]>(() => {
    const normalizeName = (value?: string | null) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : 'チーム未設定';
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
  }, [matches]);

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

  const handleMatchCreated = (record: MatchRecord) => {
    setMatches((prev) => [record, ...prev]);
    setCreateOpen(false);
  };

  const renderStatsChips = () => (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Chip
        label={`総対戦 ${stats.total}`}
        sx={{ bgcolor: '#0d1026', color: '#fff', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
      <Chip
        label={`結果確定 ${stats.completed}`}
        sx={{ bgcolor: '#e6f7ef', color: '#1f8a5d', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
      <Chip
        label={`結果待ち ${stats.pending}`}
        sx={{ bgcolor: '#fff4e6', color: '#b66d1f', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
      <Chip
        label={`登録チーム ${stats.teamCount}`}
        sx={{ bgcolor: '#f4f6fd', color: '#4a5162', fontWeight: 700, height: 26, '& .MuiChip-label': { px: 1.75 } }}
      />
    </Stack>
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
      <Stack spacing={1} alignItems="center" sx={{ flex: 1 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            fontWeight: 700,
            fontSize: 16,
            bgcolor: highlight ? '#0d1026' : '#f4f6fd',
            color: highlight ? '#fff' : '#4a5162',
          }}
        >
          {initial}
        </Avatar>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 700,
            color: highlight ? '#0d1026' : '#4a5162',
            textAlign: 'center',
          }}
        >
          {teamName}
        </Typography>
        {highlight && match.status !== 'pending' && match.status !== 'draw' && (
          <Chip
            label="WIN"
            size="small"
            sx={{
              bgcolor: '#0d1026',
              color: '#fff',
              fontWeight: 700,
              height: 22,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
        {isDraw && (
          <Chip
            label="DRAW"
            size="small"
            sx={{
              bgcolor: '#e8ecf8',
              color: '#43506c',
              fontWeight: 700,
              height: 22,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
        {isPending && (
          <Chip
            label="結果待ち"
            size="small"
            sx={{
              bgcolor: '#f6f7fb',
              color: '#7e8494',
              fontWeight: 600,
              height: 22,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
      </Stack>
    );

    return (
      <Paper
        key={match.id}
        sx={{
          borderRadius: 4,
          p: { xs: 2.5, md: 3 },
          bgcolor: '#fff',
          boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
          border: '1px solid rgba(24, 32, 56, 0.08)',
        }}
      >
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#7e8494' }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: 13 }}>{formatDate(match.date)}</Typography>
            </Stack>
            <Chip
              label={info.label}
              size="small"
              sx={{
                bgcolor: info.bgcolor,
                color: info.color,
                fontWeight: 700,
                height: 24,
                '& .MuiChip-label': { px: 1.75 },
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: { xs: 2, md: 3 },
            }}
          >
            {renderTeamColumn(match.homeTeam, homeInitial, isHomeWinner)}
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 96 }}>
              <Typography sx={{ fontSize: 12, color: '#7e8494', letterSpacing: '0.12em' }}>SCORE</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#1a1d2f' }}>
                {homeScoreDisplay}
                <Typography component="span" sx={{ mx: 1, fontSize: 22, color: '#7e8494' }}>
                  -
                </Typography>
                {awayScoreDisplay}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#9ba0ad', letterSpacing: '0.16em' }}>VS</Typography>
            </Stack>
            {renderTeamColumn(match.awayTeam, awayInitial, isAwayWinner)}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => onOpenResultEntry(match.id)}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                borderColor: 'rgba(24,32,56,0.18)',
                color: '#2f3645',
                '&:hover': { borderColor: '#181d3f', bgcolor: 'rgba(24,32,56,0.05)' },
              }}
            >
              結果入力へ
            </Button>
          </Box>
        </Stack>
      </Paper>
    );
  };

  const renderMatchList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="inherit" />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" startIcon={<RefreshRoundedIcon />} onClick={loadMatches}>
              再読み込み
            </Button>
          }
          sx={{ borderRadius: 3 }}
        >
          {error}
        </Alert>
      );
    }

    if (displayMatches.length === 0) {
      return (
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            bgcolor: '#fff',
            border: '1px dashed rgba(24, 32, 56, 0.16)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700, color: '#2f3645', mb: 1.5 }}>対戦カードがまだ登録されていません</Typography>
          <Typography sx={{ fontSize: 13, color: '#7e8494', mb: 3 }}>
            「対戦作成」からカードを作成すると、ここに表示されます。
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              bgcolor: '#0d1026',
              '&:hover': { bgcolor: '#181d3f' },
            }}
          >
            対戦を作成
          </Button>
        </Paper>
      );
    }

    return (
      <Stack spacing={3}>
        {displayMatches.map(renderMatchCard)}
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f6f7fb',
        py: 6,
        px: { xs: 3, md: 8 },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          maxWidth: 1120,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <Paper
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 3, md: 4 },
            px: { xs: 3, md: 4 },
            py: { xs: 3, md: 3.5 },
            borderRadius: 4,
            boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
            border: '1px solid rgba(24, 32, 56, 0.06)',
            bgcolor: '#fff',
          }}
        >
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 420 }}>
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#ff8c3d', letterSpacing: 1 }}>
                対戦管理ツール
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#6d7385', fontWeight: 600 }}>
                チーム同士の対戦カードを一覧で確認できます
              </Typography>
            </Stack>
            <ToggleButtonGroup
              exclusive
              value={view}
              onChange={(_, newView) => {
                if (newView) setView(newView);
              }}
              sx={{
                bgcolor: '#f6f7fb',
                borderRadius: 999,
                p: 0.5,
                width: '100%',
                boxShadow: 'inset 0 0 0 1px rgba(24, 32, 56, 0.08)',
                '& .MuiToggleButton-root': {
                  flex: 1,
                  border: 'none',
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#6a7184',
                },
                '& .Mui-selected': {
                  bgcolor: '#f4f7ff',
                  color: '#1a1d2f',
                  boxShadow: '0 6px 18px rgba(34, 53, 102, 0.12)',
                },
                '& .MuiToggleButton-root:hover': {
                  bgcolor: 'rgba(30, 47, 103, 0.05)',
                },
              }}
            >
              <ToggleButton value="matches">対戦一覧</ToggleButton>
              <ToggleButton value="participants">参加者管理</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
          >
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                bgcolor: '#0d1026',
                px: 3,
                py: 1.25,
                borderRadius: 999,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: '#181d3f' },
              }}
            >
              対戦作成
            </Button>
          </Stack>
        </Paper>
        <Box>
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#293049' }}>対戦カード一覧</Typography>
              <Typography sx={{ fontSize: 13, color: '#7e8494' }}>
                チーム VS チームのカード情報とスコアを確認できます。
              </Typography>
            </Stack>
            {renderStatsChips()}
          </Stack>
          {view === 'matches' ? (
            renderMatchList()
          ) : (
            <Paper
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: '#fff',
                border: '1px dashed rgba(24, 32, 56, 0.16)',
              }}
            >
              <Typography sx={{ fontWeight: 700, color: '#2f3645', mb: 1.5 }}>参加者管理は準備中です</Typography>
              <Typography sx={{ fontSize: 13, color: '#7e8494' }}>
                参加メンバーの整理やシード設定など、管理機能を順次追加予定です。
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
      <MatchCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleMatchCreated} />
    </Box>
  );
};

type MatchCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: MatchRecord) => void;
};

const MatchCreateDialog: React.FC<MatchCreateDialogProps> = ({ open, onClose, onCreated }) => {
  const [values, setValues] = useState<MatchFormValues>(createInitialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(createInitialValues());
      setError(null);
    }
  }, [open]);

  const handleChange =
    (field: keyof MatchFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        team: values.team.trim(),
        opponentTeam: values.opponentTeam.trim(),
        date: values.date ? values.date : null,
      };

      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const record: MatchRecord = await response.json();
      onCreated(record);
    } catch (err) {
      console.error('Error creating match:', err);
      setError('対戦の作成に失敗しました。入力内容を確認して再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || values.team.trim() === '' || values.opponentTeam.trim() === '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>対戦を作成</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography sx={{ fontSize: 13, color: '#6a7184' }}>
            プレイヤーやスコアは「結果入力」で設定できます。まずはカードに載せたいチーム名と日付だけ登録しましょう。
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            <TextField
              label="チーム"
              value={values.team}
              onChange={handleChange('team')}
              placeholder="例: チームA"
              fullWidth
              required
            />
            <TextField
              label="チーム"
              value={values.opponentTeam}
              onChange={handleChange('opponentTeam')}
              placeholder="例: チームB"
              fullWidth
              required
            />
            <TextField
              label="対戦日"
              type="date"
              value={values.date}
              onChange={handleChange('date')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitDisabled}>
          {submitting ? '作成中...' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchManager;
