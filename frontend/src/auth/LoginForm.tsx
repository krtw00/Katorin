import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from './AuthContext';
import AdminCreateDialog from '../admin/AdminCreateDialog';

type LoginFormProps = {
  onSuccess?: () => void;
};

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { signInWithPassword } = useAuth();
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
      await signInWithPassword({ email, password });
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
      <Paper elevation={3} sx={{ maxWidth: 420, width: '100%', padding: 4 }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
          <Typography component="h1" variant="h5" textAlign="center" fontWeight="bold">
            Katorin ログイン
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            登録済みのメールアドレスとパスワードでサインインしてください。
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
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
          <TextField
            label="パスワード"
            type="password"
            required
            fullWidth
            disabled={submitting}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <Stack spacing={2}>
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
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
