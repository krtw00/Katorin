import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';

interface PasswordResetFormProps {
  onBackToLogin: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch('/api/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'パスワードのリセットに失敗しました。');
      }

      setSuccess('パスワードが正常にリセットされました。ログイン画面に戻って新しいパスワードでログインしてください。');
      setEmail('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || '予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <Card sx={{ minWidth: 360, maxWidth: 480, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" textAlign="center">
            パスワードリセット
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="メールアドレス"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="新しいパスワード"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                fullWidth
                helperText="6文字以上で入力してください。"
              />
              <Button type="submit" variant="contained" fullWidth disabled={loading}>
                {loading ? 'リセット中...' : 'パスワードをリセット'}
              </Button>
              <Button variant="text" onClick={onBackToLogin} fullWidth>
                ログイン画面に戻る
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PasswordResetForm;
