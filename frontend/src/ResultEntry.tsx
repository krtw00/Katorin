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
  DialogContentText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';

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

const determineScoreStatus = (selfScore: number | null, opponentScore: number | null): ScoreStatus => {
  if (selfScore === null || opponentScore === null) return 'pending';
  if (selfScore > opponentScore) return 'homeWin';
  if (selfScore < opponentScore) return 'awayWin';
  return 'draw';
};

const statusMeta: Record<ScoreStatus, { chipBg: string; chipColor: string; homeHighlight: boolean; awayHighlight: boolean }> = {
  homeWin: { chipBg: '#e6f7ef', chipColor: '#1f8a5d', homeHighlight: true, awayHighlight: false },
  awayWin: { chipBg: '#e6f7ef', chipColor: '#1f8a5d', homeHighlight: false, awayHighlight: true },
  draw: { chipBg: '#e8ecf8', chipColor: '#43506c', homeHighlight: false, awayHighlight: false },
  pending: { chipBg: '#fff4e6', chipColor: '#b66d1f', homeHighlight: false, awayHighlight: false },
};

const getInitial = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : '？';
};

const ResultEntry: React.FC<ResultEntryProps> = ({ tournament, matchId, onBack, onSaved }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const [form, setForm] = useState<MatchFormValues>(emptyForm);
  const [gameRows, setGameRows] = useState<GameRow[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [persistedScores, setPersistedScores] = useState<{ home: string; away: string }>({ home: '', away: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [rowModalState, setRowModalState] = useState<{ open: boolean; mode: 'create' | 'edit'; draft: GameRow }>({
    open: false,
    mode: 'create',
    draft: emptyRow,
  });
  const [deleteState, setDeleteState] = useState<{ open: boolean; targetId?: string }>({ open: false });
  const [initialized, setInitialized] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
      return gameRows.length === 0 ? t('resultEntry.notRegistered') : t('resultEntry.pending');
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
    return gameRows.length === 0 ? t('resultEntry.notRegistered') : t('resultEntry.pending');
  }, [isFinalized, scoreState, form.team, form.opponentTeam, gameRows.length, t]);

  const snapshot = useMemo(() => makeSnapshot(form, gameRows), [form, gameRows, makeSnapshot]);

  const handleChange =
    (field: keyof MatchFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const fetchMatch = useCallback(async () => {
    if (!matchId) {
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
      const newFormState: MatchFormValues = {
        team: data.team ?? '',
        opponentTeam: data.opponentTeam ?? '',
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
            homeTeam: row.homeTeam ?? (data.team ?? ''),
            homePlayer: row.homePlayer ?? '',
            homeDeck: row.homeDeck ?? '',
            homeScore: row.homeScore ?? '',
            awayTeam: row.awayTeam ?? (data.opponentTeam ?? ''),
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
            homeTeam: row.homeTeam ?? (data.team ?? ''),
            homePlayer: row.homePlayer ?? '',
            homeDeck: row.homeDeck ?? '',
            homeScore: row.homeScore ?? '',
            awayTeam: row.awayTeam ?? (data.opponentTeam ?? ''),
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
  }, [authFetch, makeSnapshot, matchId, t]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

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
          finalized: mode === 'finalize' ? true : mode === 'unfinalize' ? false : isFinalized,
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
              ? { home: String(parsedTotals.home ?? ''), away: String(parsedTotals.away ?? '') }
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
    <Paper
      sx={{
        borderRadius: 4,
        p: { xs: 3, md: 4 },
        bgcolor: '#fff',
        boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
        border: '1px solid rgba(24, 32, 56, 0.08)',
      }}
    >
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1a1d2f' }}>{t('resultEntry.matchScore')}</Typography>
          <Chip
            label={scoreStatusLabel}
            sx={{
              bgcolor: scoreStatusMeta.chipBg,
              color: scoreStatusMeta.chipColor,
              fontWeight: 700,
              height: 26,
              '& .MuiChip-label': { px: 1.75 },
            }}
          />
        </Stack>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 3, md: 4 },
          }}
        >
          {renderTeamColumn(form.team, scoreStatusMeta.homeHighlight)}
          <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 120 }}>
            <Typography sx={{ fontSize: 12, color: '#7e8494', letterSpacing: '0.12em' }}>SCORE</Typography>
            <Typography sx={{ fontSize: 34, fontWeight: 800, color: '#1a1d2f' }}>
              {totals.homeTotal}
              <Typography component="span" sx={{ mx: 1, fontSize: 24, color: '#7e8494' }}>
                -
              </Typography>
              {totals.awayTotal}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#9ba0ad', letterSpacing: '0.16em' }}>VS</Typography>
          </Stack>
          {renderTeamColumn(form.opponentTeam, scoreStatusMeta.awayHighlight)}
        </Box>
      </Stack>
    </Paper>
  );

  const renderTeamColumn = (teamName: string, highlight: boolean) => (
    <Stack spacing={1} alignItems="center" sx={{ flex: 1 }}>
      <Avatar
        sx={{
          width: 48,
          height: 48,
          fontWeight: 700,
          fontSize: 18,
          bgcolor: highlight ? '#0d1026' : '#f4f6fd',
          color: highlight ? '#fff' : '#4a5162',
        }}
      >
        {getInitial(teamName)}
      </Avatar>
      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 700,
          color: highlight ? '#0d1026' : '#4a5162',
          textAlign: 'center',
        }}
      >
        {teamName || t('resultEntry.teamNotSet')}
      </Typography>
    </Stack>
  );

  const renderForm = () => (
    <Paper
      sx={{
        borderRadius: 4,
        p: { xs: 3, md: 4 },
        bgcolor: '#fff',
        boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
        border: '1px solid rgba(24, 32, 56, 0.08)',
      }}
    >
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1a1d2f' }}>{t('resultEntry.roundList')}</Typography>
          <Typography sx={{ fontSize: 13, color: '#7e8494' }}>
            {t('resultEntry.roundListDescription')}
          </Typography>
        </Stack>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1a1d2f' }}>{t('resultEntry.matchDetails')}</Typography>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={openCreateRowModal}
              disabled={disableEditing}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#0d1026',
                '&:hover': { bgcolor: '#181d3f' },
              }}
            >
              {t('resultEntry.addRound')}
            </Button>
          </Stack>
          <Table size="small" sx={{ borderSpacing: '0', borderCollapse: 'separate' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadSx}>#</TableCell>
                <TableCell sx={tableHeadSx}>{t('resultEntry.team')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('resultEntry.player')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('resultEntry.deck')}</TableCell>
                <TableCell sx={tableHeadSx} align="center">
                  {t('resultEntry.score')}
                </TableCell>
                <TableCell sx={tableHeadSx} align="center">
                  {t('resultEntry.score')}
                </TableCell>
                <TableCell sx={tableHeadSx}>{t('resultEntry.deck')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('resultEntry.player')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('resultEntry.team')}</TableCell>
                <TableCell sx={tableHeadSx} align="right">
                  {t('resultEntry.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gameRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', color: '#7e8494', py: 4 }}>
                    {t('resultEntry.noRoundsMessage')}
                  </TableCell>
                </TableRow>
              ) : (
                gameRows.map((row, index) => (
                    <TableRow key={row.id} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                      <TableCell sx={tableBodySx}>{index + 1}</TableCell>
                      <TableCell sx={tableBodySx}>{row.homeTeam || form.team || '—'}</TableCell>
                    <TableCell sx={tableBodySx}>{row.homePlayer || '—'}</TableCell>
                    <TableCell sx={tableBodySx}>{row.homeDeck || '—'}</TableCell>
                      <TableCell sx={{ ...tableBodySx, textAlign: 'center', fontWeight: 700 }}>
                        {row.homeScore || '-'}
                      </TableCell>
                      <TableCell sx={{ ...tableBodySx, textAlign: 'center', fontWeight: 700 }}>
                        {row.awayScore || '-'}
                      </TableCell>
                      <TableCell sx={tableBodySx}>{row.awayDeck || '—'}</TableCell>
                      <TableCell sx={tableBodySx}>{row.awayPlayer || '—'}</TableCell>
                      <TableCell sx={tableBodySx}>{row.awayTeam || form.opponentTeam || '—'}</TableCell>
                    <TableCell sx={{ ...tableBodySx, textAlign: 'right' }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditRoundedIcon />}
                          onClick={() => openEditRowModal(row)}
                          disabled={disableEditing}
                          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
                        >
                          {t('resultEntry.edit')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteRoundedIcon />}
                          onClick={() => confirmDeleteRow(row.id)}
                          disabled={disableEditing}
                          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
                        >
                          {t('resultEntry.delete')}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Stack>
        <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
          <Typography sx={{ fontSize: 12, color: '#7e8494' }}>{saveStatusText}</Typography>
          {isFinalized ? (
            <Button
              variant="outlined"
              onClick={() => handleSave('unfinalize', snapshot)}
              startIcon={<SaveRoundedIcon />}
              disabled={saving || autoSaving || disableInputs}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              {saving ? t('resultEntry.unfinalizing') : t('resultEntry.unfinalizeResult')}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => handleSave('finalize', snapshot)}
              startIcon={<SaveRoundedIcon />}
              disabled={saving || autoSaving || disableInputs}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#0d1026',
                '&:hover': { bgcolor: '#181d3f' },
              }}
            >
              {saving ? t('resultEntry.finalizing') : t('resultEntry.finalizeResult')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );

  const renderContent = () => {
    if (!matchId) {
      return (
        <Paper
          sx={{
            borderRadius: 4,
            p: { xs: 3, md: 4 },
            bgcolor: '#fff',
            boxShadow: '0 18px 45px rgba(14, 30, 64, 0.08)',
            border: '1px solid rgba(24, 32, 56, 0.08)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700, color: '#2f3645', mb: 1 }}>{t('resultEntry.selectMatchPrompt')}</Typography>
          <Typography sx={{ fontSize: 13, color: '#7e8494' }}>
            {t('resultEntry.selectMatchDescription')}
          </Typography>
        </Paper>
      );
    }

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Stack spacing={3}>
        {renderScoreBoard()}
        {error && <Alert severity="error">{error}</Alert>}
        {saveFeedback && <Alert severity="success">{saveFeedback}</Alert>}
        {renderForm()}
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
          maxWidth: 960,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
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
          <Stack spacing={0.75}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#ff8c3d', letterSpacing: 1 }}>
              {t('resultEntry.title')}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#6d7385', fontWeight: 600 }}>
              {t('resultEntry.description')}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onBack}
            sx={{
              borderRadius: 999,
              px: 3,
              py: 1.15,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: 'rgba(24,32,56,0.18)',
              color: '#2f3645',
              '&:hover': { borderColor: '#181d3f', bgcolor: 'rgba(24,32,56,0.05)' },
            }}
          >
            {t('resultEntry.backToMatchList')}
          </Button>
        </Paper>
        {renderContent()}
      </Box>
      <GameRowModal
        open={rowModalState.open}
        mode={rowModalState.mode}
        draft={rowModalState.draft}
        homeTeam={form.team}
        awayTeam={form.opponentTeam}
        onClose={closeRowModal}
        onSave={handleRowSave}
      />
      <Dialog open={deleteState.open} onClose={() => setDeleteState({ open: false })}>
        <DialogTitle>{t('resultEntry.deleteRoundTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('resultEntry.deleteRoundConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteState({ open: false })}>{t('resultEntry.cancel')}</Button>
          <Button onClick={handleDeleteRow} color="error" variant="contained">
            {t('resultEntry.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
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

const GameRowModal: React.FC<GameRowModalProps> = ({ open, mode, draft, homeTeam, awayTeam, onClose, onSave }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<GameRow>(draft);

  useEffect(() => {
    setValues((prev) => ({
      ...draft,
      homeTeam,
      awayTeam,
    }));
  }, [draft, homeTeam, awayTeam]);

  const handleChange =
    (field: keyof GameRow) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSubmit = () => {
    onSave(values);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? t('resultEntry.addRoundTitle') : t('resultEntry.editRoundTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography sx={{ fontSize: 13, color: '#7e8494', mb: 0.5 }}>
            {t('resultEntry.roundModalDescription')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            <TextField
              label={t('resultEntry.team')}
              value={homeTeam}
              InputProps={{ readOnly: true, sx: { color: '#1a1d2f' } }}
              sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#1a1d2f' } }}
              disabled
            />
            <TextField
              label={t('resultEntry.team')}
              value={awayTeam}
              InputProps={{ readOnly: true, sx: { color: '#1a1d2f' } }}
              sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#1a1d2f' } }}
              disabled
            />
            <TextField label={t('resultEntry.player')} value={values.homePlayer} onChange={handleChange('homePlayer')} />
            <TextField label={t('resultEntry.player')} value={values.awayPlayer} onChange={handleChange('awayPlayer')} />
            <TextField label={t('resultEntry.deck')} value={values.homeDeck} onChange={handleChange('homeDeck')} />
            <TextField label={t('resultEntry.deck')} value={values.awayDeck} onChange={handleChange('awayDeck')} />
            <TextField
              label={t('resultEntry.score')}
              value={values.homeScore}
              onChange={handleChange('homeScore')}
              type="number"
              inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
            />
            <TextField
              label={t('resultEntry.score')}
              value={values.awayScore}
              onChange={handleChange('awayScore')}
              type="number"
              inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('resultEntry.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained">
          {mode === 'create' ? t('resultEntry.add') : t('resultEntry.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const tableHeadSx = {
  fontWeight: 700,
  fontSize: 12,
  color: '#7e8494',
  borderBottom: '1px solid rgba(24,32,56,0.12)',
  whiteSpace: 'nowrap' as const,
};

const tableBodySx = {
  fontSize: 13,
  color: '#2f3645',
  borderBottom: '1px solid rgba(24,32,56,0.08)',
};

export default ResultEntry;
