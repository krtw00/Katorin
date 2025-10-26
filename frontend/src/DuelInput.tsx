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
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';

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

const columns: Array<{ key: keyof MatchRecordFormValues; label: string; align?: 'center' | 'right'; group?: 'self' | 'opponent' }> = [
  { key: 'team', label: 'チーム', group: 'self' },
  { key: 'player', label: '選手', group: 'self' },
  { key: 'deck', label: 'デッキ', group: 'self' },
  { key: 'selfScore', label: 'スコア', align: 'center', group: 'self' },
  { key: 'opponentScore', label: 'スコア', align: 'center', group: 'opponent' },
  { key: 'opponentDeck', label: 'デッキ', group: 'opponent' },
  { key: 'opponentPlayer', label: '選手', group: 'opponent' },
  { key: 'opponentTeam', label: 'チーム', group: 'opponent' },
  { key: 'date', label: '日付', align: 'center' },
];

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
      <DialogTitle>{mode === 'create' ? '対戦記録を追加' : '対戦記録を編集'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="チーム"
                value={values.team}
                onChange={handleChange('team')}
                fullWidth
                sx={modalFieldStyles.self}
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="チーム"
                value={values.opponentTeam}
                onChange={handleChange('opponentTeam')}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="選手"
                value={values.player}
                onChange={handleChange('player')}
                fullWidth
                sx={modalFieldStyles.self}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="選手"
                value={values.opponentPlayer}
                onChange={handleChange('opponentPlayer')}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="デッキ" value={values.deck} onChange={handleChange('deck')} fullWidth sx={modalFieldStyles.self} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="デッキ"
                value={values.opponentDeck}
                onChange={handleChange('opponentDeck')}
                fullWidth
                sx={modalFieldStyles.opponent}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="スコア"
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
                label="スコア"
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
                label="日付"
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
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit} variant="contained">
          {mode === 'create' ? '追加' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DuelInput: React.FC = () => {
  const authFetch = useAuthorizedFetch();
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [modalState, setModalState] = useState<{ open: boolean; mode: 'create' | 'edit'; targetId?: string }>({
    open: false,
    mode: 'create',
  });
  const [confirmState, setConfirmState] = useState<{ open: boolean; targetId?: string }>({ open: false });

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await authFetch('/api/matches');
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
  }, [authFetch]);

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
        const response = await authFetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
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
          対戦記録一覧
        </Typography>
        <Button variant="contained" onClick={openCreateModal}>
          対戦記録を追加
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
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6, color: 'rgba(255,255,255,0.6)' }}>
                  まだ対戦記録がありません。「対戦記録を追加」から登録してください。
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
                      <Tooltip title="Edit record">
                        <IconButton size="small" color="primary" onClick={() => openEditModal(record.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete record">
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
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent dividers>
          <Typography>この対戦記録を削除しますか？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>キャンセル</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DuelInput;
