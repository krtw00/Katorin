export type MatchRecord = {
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
  tournament_id?: string | null;
  round_id?: string | null;
  timezone?: string | null;
  input_allowed_team_id?: string | null; // 'admin' | team uuid | null
  result_status?: 'draft' | 'finalized' | string | null;
};

export type MatchFormValues = {
  team: string;
  opponentTeam: string;
  date: string;
};

export type CardStatus = 'homeWin' | 'awayWin' | 'draw' | 'pending';

export type DisplayMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  timestamp: number;
  homeScore: number | null;
  awayScore: number | null;
  status: CardStatus;
};

export type MatchStats = {
  total: number;
  completed: number;
  pending: number;
  teamCount: number;
};

export const createInitialValues = (): MatchFormValues => ({
  team: '',
  opponentTeam: '',
  date: '',
});

export const formatDate = (value?: string | null, fallback: string = '') => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const toTimestamp = (value?: string | null) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

export const parseScoreValue = (value?: string | null): number | null => {
  if (value === null || value === undefined) return null;
  const trimmed = value.toString().trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const determineStatus = (homeScore: number | null, awayScore: number | null): CardStatus => {
  if (homeScore === null || awayScore === null) {
    return 'pending';
  }
  if (homeScore > awayScore) return 'homeWin';
  if (homeScore < awayScore) return 'awayWin';
  return 'draw';
};

export const getInitial = (value?: string | null) => {
  if (!value) return '？';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : '？';
};

export const statusMeta = {
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
