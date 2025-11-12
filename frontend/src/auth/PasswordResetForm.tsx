import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Alert, Button, Card, Input, Space, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import AntLanguageSwitcher from '../components/AntLanguageSwitcher';
import { supabase } from '../lib/supabaseClient';

const { Title, Text } = Typography;

interface PasswordResetFormProps {
  onBackToLogin: () => void;
}

/**
 * パスワードリセットフォームコンポーネント（Ant Design版）
 * メール送信とパスワード更新の両方をサポート
 */
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        padding: 16,
      }}
    >
      <Card
        style={{
          minWidth: 360,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <AntLanguageSwitcher />
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3} style={{ textAlign: 'center', margin: 0 }}>
            {t('auth.passwordReset.title')}
          </Title>

          {error && (
            <Alert
              message={error}
              type="error"
              closable
              onClose={() => setError(null)}
            />
          )}

          {success && (
            <Alert
              message={success}
              type="success"
              closable
              onClose={() => setSuccess(null)}
            />
          )}

          <form onSubmit={handleSubmit}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {!isResettingPassword ? (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    {t('auth.passwordReset.emailLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
                  </label>
                  <Input
                    prefix={<MailOutlined />}
                    type="email"
                    placeholder={t('auth.passwordReset.emailLabel')}
                    size="large"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    {t('auth.passwordReset.newPasswordLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
                  </label>
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder={t('auth.passwordReset.newPasswordLabel')}
                    size="large"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    {t('auth.passwordReset.newPasswordHelperText')}
                  </Text>
                </div>
              )}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                {loading
                  ? t('auth.passwordReset.submitting')
                  : isResettingPassword
                  ? t('auth.passwordReset.submitButton')
                  : t('auth.passwordReset.sendResetLink')}
              </Button>

              <Button
                type="link"
                onClick={onBackToLogin}
                block
              >
                {t('auth.passwordReset.backToLogin')}
              </Button>
            </Space>
          </form>
        </Space>
      </Card>
    </div>
  );
};

export default PasswordResetForm;
