import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

type AdminCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (email: string) => void;
};

const AdminCreateDialog: React.FC<AdminCreateDialogProps> = ({ open, onClose, onCreated }) => {
  const authFetch = useAuthorizedFetch();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setToken('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName.trim() || undefined,
          token: token.trim(),
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
        throw new Error('サーバーが不正なレスポンスを返しました。');
      }
      const result = await response.json();
      onCreated?.(result.email ?? email);
      reset();
      onClose();
    } catch (err) {
      console.error('Failed to create admin user:', err);
      setError(
        err instanceof Error ? err.message : '管理者アカウントの作成に失敗しました。時間をおいて再度お試しください。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled =
    submitting || email.trim().length === 0 || password.trim().length < 6 || token.trim().length === 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>運営アカウントを作成</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            作成したメールアドレスとパスワードでログインできる運営アカウントを追加します。追加されたユーザーには自動的に管理者権限が付与されます。
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
            required
            disabled={submitting}
          />
          <TextField
            label="パスワード（6文字以上）"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={submitting}
          />
          <TextField
            label="表示名（任意）"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={submitting}
          />
          <TextField
            label="登録コード"
            helperText="管理者に共有された ADMIN_SIGNUP_TOKEN を入力してください。"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            disabled={submitting}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isDisabled}>
          {submitting ? '作成中...' : '作成する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminCreateDialog;
