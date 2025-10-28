import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { supabase } from '../lib/supabaseClient';

interface PasswordResetFormProps {
  onBackToLogin: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBackToLogin }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      // Supabaseのセッションを設定
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          setIsResettingPassword(true);
          setSuccess(null);
          setError(null);
        })
        .catch((err) => {
          console.error('Error setting session:', err);
          setError(t('auth.passwordReset.unexpectedError'));
        });
    }
  }, [location.hash, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isResettingPassword) {
      // パスワードリセットトークンがある場合（新しいパスワードを設定）
      if (!newPassword || newPassword.length < 6) {
        setError(t('auth.passwordReset.newPasswordHelperText'));
        setLoading(false);
        return;
      }
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          throw new Error(updateError.message || t('auth.passwordReset.failed'));
        }

        setSuccess(t('auth.passwordReset.success'));
        setNewPassword('');
        setIsResettingPassword(false); // リセット完了後、通常のフローに戻す
      } catch (err: any) {
        setError(err.message || t('auth.passwordReset.unexpectedError'));
      } finally {
        setLoading(false);
      }
    } else {
      // メールアドレスを送信してリセットリンクを生成
      try {
        const response = await fetch('/api/password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('auth.passwordReset.failed'));
        }

        setSuccess(t('auth.passwordReset.successEmailSent'));
        setEmail('');
      } catch (err: any) {
        setError(err.message || t('auth.passwordReset.unexpectedError'));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <Card sx={{ minWidth: 360, maxWidth: 480, boxShadow: 3, position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </Box>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" textAlign="center">
            {t('auth.passwordReset.title')}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {!isResettingPassword ? (
                <TextField
                  label={t('auth.passwordReset.emailLabel')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
              ) : (
                <TextField
                  label={t('auth.passwordReset.newPasswordLabel')}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  fullWidth
                  helperText={t('auth.passwordReset.newPasswordHelperText')}
                />
              )}
              <Button type="submit" variant="contained" fullWidth disabled={loading}>
                {loading
                  ? t('auth.passwordReset.submitting')
                  : isResettingPassword
                  ? t('auth.passwordReset.submitButton')
                  : t('auth.passwordReset.sendResetLink')}
              </Button>
              <Button variant="text" onClick={onBackToLogin} fullWidth>
                {t('auth.passwordReset.backToLogin')}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PasswordResetForm;
