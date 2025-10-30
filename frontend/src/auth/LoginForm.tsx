import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import LanguageSwitcher from '../components/LanguageSwitcher';

type LoginFormProps = {
  onSuccess?: () => void;
  onShowPasswordReset: () => void;
};

type LoginMode = 'admin' | 'team';

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onShowPasswordReset }) => {
  const { t } = useTranslation();
  const { signInWithPassword } = useAuth();
  const [mode, setMode] = useState<LoginMode>('admin');
  const [email, setEmail] = useState('');
  const [tournamentSlug, setTournamentSlug] = useState('');
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');

  const handleModeChange = (_: React.SyntheticEvent, newMode: LoginMode) => {
    if (mode !== newMode) {
      setMode(newMode);
      setEmail('');
      setTournamentSlug('');
      setTeamName('');
      setPassword('');
      setError(null);
    }
  };

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'team') {
        if (!teamName.trim() || !tournamentSlug.trim()) {
          throw new Error(t('auth.login.teamFieldsRequired'));
        }
        const teamEmail = `${teamName.trim()}@${tournamentSlug.trim()}.players.local`;
        await signInWithPassword({ email: teamEmail, password });
      } else {
        await signInWithPassword({ email, password });
      }


      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.login.loginFailed');
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
      <Paper elevation={3} sx={{ maxWidth: 480, width: '100%', padding: 4, position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </Box>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography component="h1" variant="h5" textAlign="center" fontWeight="bold">
              {t('auth.login.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('auth.login.subtitle')}
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
            <Tab value="admin" label={t('auth.login.adminTab')} />
            <Tab value="team" label={t('auth.login.teamTab')} />
          </Tabs>

          <Stack component="form" spacing={3} onSubmit={handleSubmit}>
            {mode === 'team' ? (
              <Alert severity="info" color="info">
                {t('auth.login.teamInfo')}
              </Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            {mode === 'team' ? (
              <>
                <TextField
                  label={t('teamLoginForm.tournamentCodeLabel')}
                  required
                  fullWidth
                  disabled={submitting}
                  value={tournamentSlug}
                  onChange={(event) => setTournamentSlug(event.target.value)}
                />
                <TextField
                  label={t('auth.login.teamNameLabel')}
                  required
                  fullWidth
                  disabled={submitting}
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                />
              </>
            ) : (
              <TextField
                label={t('auth.login.emailLabel')}
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
              label={t('auth.login.passwordLabel')}
              type="password"
              required
              fullWidth
              disabled={submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              helperText={mode === 'admin' ? '' : t('auth.login.passwordHelperText')}
            />
            <Stack spacing={2}>
              <Button type="submit" variant="contained" size="large" disabled={submitting || (mode === 'team' && teamName.trim().length === 0)}>
                {submitting ? t('auth.login.submitting') : t('auth.login.submitButton')}
              </Button>
              {mode === 'admin' && (
                <Button variant="text" size="small" onClick={onShowPasswordReset} sx={{ alignSelf: 'center' }}>
                  {t('auth.login.forgotPassword')}
                </Button>
              )}
              <Divider flexItem>
                <Typography variant="caption" color="text.secondary">
                  {t('auth.login.adminCreateSection')}
                </Typography>
              </Divider>
              <Button
                variant="outlined"
                onClick={() => {
                  setAdminDialogOpen(true);
                }}
                disabled={submitting}
              >
                {t('auth.login.adminCreateButton')}
              </Button>
            </Stack>
          </Stack>

          {adminSuccess ? (
            <Alert severity="success" onClose={() => setAdminSuccess(null)}>
              {adminSuccess}
            </Alert>
          ) : null}
        </Stack>
        <AdminCreateDialog
          open={adminDialogOpen}
          onClose={() => setAdminDialogOpen(false)}
          onCreated={(createdEmail) => {
            setAdminDialogOpen(false);
            setAdminSuccess(t('auth.login.adminCreatedSuccess', { email: createdEmail }));
          }}
        />
      </Paper>
    </Box>
  );
};

export default LoginForm;
