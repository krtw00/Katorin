import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

const TeamLoginForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();
  const [tournamentSlug, setTournamentSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // チーム用の独自ログインAPIを使用
      const resp = await fetch('/api/teams/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      // JWT と teamId を保存
      localStorage.setItem('team_jwt_token', data.token);
      localStorage.setItem('team_id', data.teamId);
      if (data.name) localStorage.setItem('team_name', data.name);

      navigate('/team-dashboard');
    } catch (err: any) {
      console.error('Team login error:', err);
      setError(err.message || t('teamLoginForm.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f4f6fb',
        p: 2,
      }}
    >
      <Paper elevation={6} sx={{ p: 4, maxWidth: 400, width: '100%', borderRadius: 2 }}>
        <Stack spacing={3}>
          <Typography variant="h5" component="h1" align="center" fontWeight="bold">
            {t('teamLoginForm.title')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <form onSubmit={handleLogin}>
            <Stack spacing={2}>
              <TextField
                label={t('teamLoginForm.tournamentCodeLabel')}
                variant="outlined"
                fullWidth
                value={tournamentSlug}
                onChange={(e) => setTournamentSlug(e.target.value)}
                required
              />
              <TextField
                label={t('teamLoginForm.username')}
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <TextField
                label={t('teamLoginForm.password')}
                variant="outlined"
                fullWidth
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, mt: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : t('teamLoginForm.loginButton')}
              </Button>
            </Stack>
          </form>
          <Button
            variant="text"
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            {t('teamLoginForm.backToAdminLogin')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default TeamLoginForm;
