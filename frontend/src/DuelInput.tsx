import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';

type MatchRecord = {
  id: string;
  team: string;
  player: string;
  deck: string;
  selfScore: string;
  opponentScore: string;
  opponentTeam: string;
  opponentPlayer: string;
  opponentDeck: string;
  date: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type MatchRecordFormValues = Omit<MatchRecord, 'id'>;

const groupStyles = {
  self: {
    headerBg: 'rgba(70, 124, 224, 0.35)',
    headerColor: '#e0ecff',
    cellBg: 'rgba(70, 124, 224, 0.1)',
  },
  opponent: {
    headerBg: 'rgba(224, 86, 70, 0.35)',
    headerColor: '#ffe1e1',
    cellBg: 'rgba(224, 86, 70, 0.2)',
  },
} satisfies Record<'self' | 'opponent', { headerBg: string; headerColor: string; cellBg: string }>;

const modalFieldStyles = {
  self: {
    '& .MuiInputBase-root': {
      backgroundColor: 'rgba(70, 124, 224, 0.12)',
    },
    '& .MuiInputLabel-root': {
      color: '#6f9dff',
    },
  },
  opponent: {
    '& .MuiInputBase-root': {
      backgroundColor: 'rgba(224, 86, 70, 0.18)',
    },
    '& .MuiInputBase-input': {
      color: '#111',
    },
    '& .MuiInputLabel-root': {
      color: '#d46060',
    },
  },
};

const emptyValues: MatchRecordFormValues = {
  team: '',
  player: '',
  deck: '',
  selfScore: '',
  opponentScore: '',
  opponentTeam: '',
  opponentPlayer: '',
  opponentDeck: '',
  date: '',
};

type RecordModalProps = {
  open: boolean;
  initialValues: MatchRecordFormValues;
  mode: 'create' | 'edit';
  onSave: (values: MatchRecordFormValues) => void;
  onClose: () => void;
};

const RecordModal: React.FC<RecordModalProps> = ({ open, initialValues, mode, onSave, onClose }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MatchRecordFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [open, initialValues]);

  const handleChange =
    (field: keyof MatchRecordFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (field === 'selfScore' || field === 'opponentScore') {
        const numeric = value.replace(/[^\d]/g, '');
        setValues((prev) => ({ ...prev, [field]: numeric }));
      } else {
        setValues((prev) => ({ ...prev, [field]: value }));
      }
    };

  const handleSubmit = () => {
    onSave(values);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{mode === 'create' ? t('duelInput.addRecord') : t('duelInput.editRecord')}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.team')}
                value={values.team}
                onChange={handleChange('team')}
                fullWidth
                sx={modalFieldStyles.self}
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.team')}
                value={values.opponentTeam}
                onChange={handleChange('opponentTeam')}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.player')}
                value={values.player}
                onChange={handleChange('player')}
                fullWidth
                sx={modalFieldStyles.self}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.player')}
                value={values.opponentPlayer}
                onChange={handleChange('opponentPlayer')}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label={t('duelInput.deck')} value={values.deck} onChange={handleChange('deck')} fullWidth sx={modalFieldStyles.self} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.deck')}
                value={values.opponentDeck}
                onChange={handleChange('opponentDeck')}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.score')}
                value={values.selfScore}
                onChange={handleChange('selfScore')}
                type="number"
                inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
                fullWidth
                sx={modalFieldStyles.self}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.score')}
                value={values.opponentScore}
                onChange={handleChange('opponentScore')}
                type="number"
                inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('duelInput.date')}
                type="date"
                value={values.date}
                onChange={handleChange('date')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('duelInput.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained">
          {mode === 'create' ? t('duelInput.add') : t('duelInput.update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DuelInput: React.FC = () => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const defaultTournamentId = process.env.REACT_APP_DEFAULT_TOURNAMENT_ID ?? null;
  const [tournamentId, setTournamentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return defaultTournamentId;
    }
    return window.localStorage.getItem('katorin:selectedTournamentId') ?? defaultTournamentId;
  });
  const [roundId, setRoundId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('katorin:selectedRoundId');
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleTournamentChange = (event: Event) => {
      const detail = (event as CustomEvent<Tournament | undefined>).detail;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        setTournamentId(detail.id as string);
      }
    };
    const handleTournamentClear = () => {
      setTournamentId(defaultTournamentId ?? null);
    };
    const handleRoundChange = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string } | undefined>).detail;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        setRoundId(detail.id as string);
      }
    };
    const handleRoundClear = () => {
      setRoundId(null);
    };
    window.addEventListener('katorin:tournamentChanged', handleTournamentChange as EventListener);
    window.addEventListener('katorin:tournamentCleared', handleTournamentClear);
    window.addEventListener('katorin:roundChanged', handleRoundChange as EventListener);
    window.addEventListener('katorin:roundCleared', handleRoundClear);
    return () => {
      window.removeEventListener('katorin:tournamentChanged', handleTournamentChange as EventListener);
      window.removeEventListener('katorin:tournamentCleared', handleTournamentClear);
      window.removeEventListener('katorin:roundChanged', handleRoundChange as EventListener);
      window.removeEventListener('katorin:roundCleared', handleRoundClear);
    };
  }, [defaultTournamentId]);
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [modalState, setModalState] = useState<{ open: boolean; mode: 'create' | 'edit'; targetId?: string }>({
    open: false,
    mode: 'create',
  });
  const [confirmState, setConfirmState] = useState<{ open: boolean; targetId?: string }>({ open: false });

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        if (!tournamentId) {
          setRecords([]);
          return;
        }
        const params = new URLSearchParams({ tournamentId });
        if (roundId) {
          params.set('roundId', roundId);
        }
        const response = await authFetch(`/api/matches?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setRecords(data);
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();
  }, [authFetch, tournamentId, roundId]);

  const modalInitialValues = useMemo<MatchRecordFormValues>(() => {
    if (modalState.mode === 'edit' && modalState.targetId) {
      const target = records.find((record) => record.id === modalState.targetId);
      if (target) {
        const { id, ...rest } = target;
        return rest;
      }
    }
    return emptyValues;
  }, [modalState.mode, modalState.targetId, records]);

  const columns: Array<{ key: keyof MatchRecordFormValues; label: string; align?: 'center' | 'right'; group?: 'self' | 'opponent' }> = [
    { key: 'team', label: t('duelInput.team'), group: 'self' },
    { key: 'player', label: t('duelInput.player'), group: 'self' },
    { key: 'deck', label: t('duelInput.deck'), group: 'self' },
    { key: 'selfScore', label: t('duelInput.score'), align: 'center', group: 'self' },
    { key: 'opponentScore', label: t('duelInput.score'), align: 'center', group: 'opponent' },
    { key: 'opponentDeck', label: t('duelInput.deck'), group: 'opponent' },
    { key: 'opponentPlayer', label: t('duelInput.player'), group: 'opponent' },
    { key: 'opponentTeam', label: t('duelInput.team'), group: 'opponent' },
    { key: 'date', label: t('duelInput.date'), align: 'center' },
  ];

  const openCreateModal = () => {
    setModalState({ open: true, mode: 'create' });
  };

  const openEditModal = (id: string) => {
    setModalState({ open: true, mode: 'edit', targetId: id });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false, targetId: undefined }));
  };

  const handleDelete = (id: string) => {
    setConfirmState({ open: true, targetId: id });
  };

  const closeConfirm = () => setConfirmState({ open: false });

  const confirmDelete = async () => {
    if (confirmState.targetId) {
      try {
        const response = await authFetch(`/api/matches/${confirmState.targetId}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        setRecords((prev) => prev.filter((record) => record.id !== confirmState.targetId));
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
    closeConfirm();
  };

  const handleModalSave = async (values: MatchRecordFormValues) => {
    if (modalState.mode === 'edit' && modalState.targetId) {
      try {
        const response = await authFetch(`/api/matches/${modalState.targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const updatedRecord: MatchRecord = await response.json();
        setRecords((prev) => prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record)));
      } catch (error) {
        console.error('Error updating record:', error);
      }
    } else {
      try {
        if (!tournamentId || !roundId) {
          throw new Error(t('duelInput.noTournamentOrRound'));
        }
        const response = await authFetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, tournamentId, roundId }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const newRecord: MatchRecord = await response.json();
        setRecords((prev) => [newRecord, ...prev]);
      } catch (error) {
        console.error('Error creating record:', error);
      }
    }
    closeModal();
  };

  return (
    <Paper
      elevation={6}
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: 4,
        background: 'linear-gradient(180deg, #12172b 0%, #0b0d18 100%)',
        color: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>
          {t('duelInput.matchRecordList')}
        </Typography>
        <Button variant="contained" onClick={openCreateModal}>
          {t('duelInput.addRecord')}
        </Button>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Table
          sx={{
            minWidth: 960,
            '& th': {
              borderBottom: '2px solid rgba(255,255,255,0.2)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              color: '#e2e4ff',
              verticalAlign: 'bottom',
            },
            '& td': {
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              color: '#f3f3f3',
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const style = column.group ? groupStyles[column.group] : undefined;
                return (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{
                      backgroundColor: style?.headerBg,
                      color: style?.headerColor,
                    }}
                  >
                    <Stack spacing={0.5} alignItems={column.align === 'center' ? 'center' : 'flex-start'}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          display: 'inline-block',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          backgroundColor: style?.headerBg,
                          color: style?.headerColor,
                        }}
                      >
                        {column.label}
                      </Typography>
                    </Stack>
                  </TableCell>
                );
              })}
              <TableCell align="center">{t('duelInput.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6, color: 'rgba(255,255,255,0.6)' }}>
                  {t('duelInput.noRecords')}
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  {columns.map((column) => {
                    const style = column.group ? groupStyles[column.group] : undefined;
                    const value = record[column.key] || '';
                    const isScore = column.key === 'selfScore' || column.key === 'opponentScore';
                    const isOpponentGroup = column.group === 'opponent';
                    return (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        sx={{
                          backgroundColor: style?.cellBg,
                          fontWeight: isScore ? 700 : 500,
                          fontSize: isScore ? 18 : undefined,
                          textAlign: isScore ? 'center' : undefined,
                          color: isOpponentGroup ? '#ffd3d0' : undefined,
                        }}
                      >
                        {value === '' ? '-' : value}
                      </TableCell>
                    );
                  })}
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title={t('duelInput.editRecord')}>
                        <IconButton size="small" color="primary" onClick={() => openEditModal(record.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('duelInput.delete')}>
                        <IconButton size="small" color="error" onClick={() => handleDelete(record.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <RecordModal
        open={modalState.open}
        mode={modalState.mode}
        initialValues={modalInitialValues}
        onSave={handleModalSave}
        onClose={closeModal}
      />
      <Dialog open={confirmState.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>{t('duelInput.deleteConfirmation')}</DialogTitle>
        <DialogContent dividers>
          <Typography>{t('duelInput.deleteConfirmationMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>{t('duelInput.cancel')}</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            {t('duelInput.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DuelInput;
