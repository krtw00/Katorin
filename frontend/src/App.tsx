import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import './App.css';

import LegendCupMock from './LegendCupMock';
import { legendCupDefault } from './legendCupDefaults';
import LegendCupInput from './LegendCupInput';
import { teamOptions } from './teamOptions';

function App() {
  const [tab, setTab] = useState<'output' | 'input'>('output');
  const form = useMemo(() => legendCupDefault, []);
  const [accountName, setAccountName] = useState('LEGEND CUP');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState(accountName);
  const [filters, setFilters] = useState<{ date: string; team: string }>({ date: form.date, team: teamOptions[0] ?? '' });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(filters);

  const openAccountModal = () => {
    setAccountDraft(accountName);
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
  };

  const handleAccountSave = () => {
    setAccountName(accountDraft.trim() === '' ? 'ゲスト' : accountDraft.trim());
    setAccountModalOpen(false);
  };



  const closeFilterModal = () => setFilterModalOpen(false);

  const handleFilterSave = () => {
    setFilters({
      date: filterDraft.date || form.date,
      team: filterDraft.team,
    });
    setFilterModalOpen(false);
  };

  return (
    <>
      <CssBaseline />
      <Box className="App">
        <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: '#080c1a',
              color: '#fff',
              px: 4,
              py: 2.5,
              borderRadius: 3,
              boxShadow: '0 18px 30px rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.24em',
                lineHeight: 1,
              }}
            >
              Katorin
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontWeight: 600, letterSpacing: '0.06em' }}>アカウント: {accountName}</Typography>
              <Button variant="outlined" color="inherit" onClick={openAccountModal}>
                アカウント設定
              </Button>
            </Box>
          </Box>
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue as 'output' | 'input')}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="出力プレビュー" value="output" />
            <Tab label="入力フォーム" value="input" />
          </Tabs>
          {tab === 'output' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper
                elevation={4}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <TextField
                  label="日付"
                  type="date"
                  value={filters.date}
                  onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="チーム"
                  select
                  value={filters.team}
                  onChange={(event) => setFilters((prev) => ({ ...prev, team: event.target.value }))}
                  sx={{ minWidth: 220 }}
                >
                  {teamOptions.map((team) => (
                    <MenuItem key={team} value={team}>
                      {team}
                    </MenuItem>
                  ))}
                </TextField>
              </Paper>
              <LegendCupMock form={form} />
            </Box>
          ) : (
            <LegendCupInput />
          )}
        </Container>
        <Dialog open={accountModalOpen} onClose={closeAccountModal} maxWidth="xs" fullWidth>
          <DialogTitle>アカウント名の設定</DialogTitle>
          <DialogContent dividers>
            <TextField
              label="アカウント名"
              value={accountDraft}
              onChange={(event) => setAccountDraft(event.target.value)}
              fullWidth
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAccountModal}>キャンセル</Button>
            <Button onClick={handleAccountSave} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={filterModalOpen} onClose={closeFilterModal} maxWidth="sm" fullWidth>
          <DialogTitle>日付・チームを設定</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="日付"
                type="date"
                value={filterDraft.date}
                onChange={(event) => setFilterDraft((prev) => ({ ...prev, date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="チーム"
                select
                value={filterDraft.team}
                onChange={(event) => setFilterDraft((prev) => ({ ...prev, team: event.target.value }))}
              >
                {teamOptions.map((team) => (
                  <MenuItem key={team} value={team}>
                    {team}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeFilterModal}>キャンセル</Button>
            <Button onClick={handleFilterSave} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}

export default App;
