import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    setToken('');
    setError(null);
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
          token: token.trim() || undefined,
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
        throw new Error(t('admin.create.errorInvalidResponse'));
      }
      const result = await response.json();
      onCreated?.(result.email ?? email);
      reset();
      onClose();
    } catch (err) {
      console.error('Failed to create admin user:', err);
      setError(
        err instanceof Error ? err.message : t('admin.create.errorFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled =
    submitting || email.trim().length === 0 || password.trim().length < 6;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEnforceFocus>
      <DialogTitle>{t('admin.create.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t('admin.create.subtitle')}
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label={t('admin.create.emailLabel')}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
            required
            disabled={submitting}
          />
          <TextField
            label={t('admin.create.passwordLabel')}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={submitting}
          />
          <TextField
            label={t('admin.create.displayNameLabel')}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={submitting}
          />
          <TextField
            label={t('admin.create.tokenLabel')}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            disabled={submitting}
            helperText={t('admin.create.tokenHelper')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t('admin.create.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isDisabled}>
          {submitting ? t('admin.create.submitting') : t('admin.create.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminCreateDialog;
