import React, { useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from './AuthContext';
import AdminCreateDialog from '../admin/AdminCreateDialog';

type LoginFormProps = {
  onSuccess?: () => void;
};

type LoginMode = 'admin' | 'team';

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { signInWithPassword } = useAuth();
  const [mode, setMode] = useState<LoginMode>('admin');
  const handleModeChange = (_: React.SyntheticEvent, newMode: LoginMode) => {
    if (mode !== newMode) {
      setMode(newMode);
      setEmail('');
      setPassword('');
      setError(null);
    }
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode !== 'admin') {
        throw new Error('チームログインは準備中です。');
      }
      if (mode === 'team') {
        await signInWithPassword({ email: teamName, password });
      } else {
        await signInWithPassword({ email, password });
      }
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ログインに失敗しました。';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="section"
      sx={{
        minHeight: '100vh',
        bgcolor: '#f4f6fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Paper elevation={3} sx={{ maxWidth: 480, width: '100%', padding: 4 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography component="h1" variant="h5" textAlign="center" fontWeight="bold">
              Katorin ログイン
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              利用者に応じてタブを選んでサインインしてください。
            </Typography>
          </Stack>

          <Tabs
            value={mode}
            onChange={(event, value) => handleModeChange(event, value as LoginMode)}
            variant="fullWidth"
            sx={{
              bgcolor: '#f4f6fb',
              borderRadius: 999,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 14,
                color: '#6a7184',
              },
              '& .Mui-selected': {
                bgcolor: '#fff',
                boxShadow: '0 6px 18px rgba(34, 53, 102, 0.12)',
                color: '#1a1d2f !important',
              },
            }}
          >
            <Tab value="admin" label="運営ログイン" />
            <Tab value="team" label="チームログイン" />
          </Tabs>

          <Stack component="form" spacing={3} onSubmit={handleSubmit}>
            {mode === 'team' ? (
              <Alert severity="info" color="info">
                チーム用ログインは準備中です。運営ログインをご利用ください。
              </Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            {mode === 'team' ? (
              <TextField
                label="チーム名（ユーザー名）"
                required
                fullWidth
                disabled={submitting}
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
              />
            ) : (
              <TextField
                label="メールアドレス"
                type="email"
                required
                fullWidth
                disabled={submitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            )}
            <TextField
              label="パスワード"
              type="password"
              required
              fullWidth
              disabled={submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              helperText={mode === 'admin' ? '' : '運営が配布したパスワードを入力してください'}
            />
            <Stack spacing={2}>
              <Button type="submit" variant="contained" size="large" disabled={submitting || (mode === 'team' && teamName.trim().length === 0)}>
                {submitting ? 'サインイン中...' : 'サインイン'}
              </Button>
              <Divider flexItem>
                <Typography variant="caption" color="text.secondary">
                  運営アカウントの作成
                </Typography>
              </Divider>
              <Button
                variant="outlined"
                onClick={() => {
                  setAdminDialogOpen(true);
                }}
                disabled={submitting}
              >
                運営アカウントを追加
              </Button>
            </Stack>
          </Stack>

          {adminSuccess ? (
            <Alert severity="success" onClose={() => setAdminSuccess(null)}>
              {adminSuccess}
            </Alert>
          ) : null}
        </Stack>
        {adminSuccess ? (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setAdminSuccess(null)}>
            {adminSuccess}
          </Alert>
        ) : null}
        <AdminCreateDialog
          open={adminDialogOpen}
          onClose={() => setAdminDialogOpen(false)}
          onCreated={(createdEmail) => {
            setAdminDialogOpen(false);
            setAdminSuccess(`運営アカウント（${createdEmail}）を作成しました。`);
          }}
        />
      </Paper>
    </Box>
  );
};

export default LoginForm;
