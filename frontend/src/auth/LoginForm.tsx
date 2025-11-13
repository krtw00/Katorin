import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Space,
  Tabs,
  Typography,
} from 'antd';
import { LockOutlined, MailOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import { useAuth } from './AuthContext';
import AdminCreateDialog from '../admin/AdminCreateDialog';
import AntLanguageSwitcher from '../components/AntLanguageSwitcher';

const { Title, Text } = Typography;

type LoginFormProps = {
  onSuccess?: () => void;
  onShowPasswordReset: () => void;
};

type LoginMode = 'admin' | 'team';

/**
 * ログインフォームコンポーネント（Ant Design版）
 * 管理者ログインとチームログインの両方をサポート
 */
const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onShowPasswordReset }) => {
  const { t } = useTranslation();
  const { signInWithPassword } = useAuth();
  const [mode, setMode] = useState<LoginMode>('admin');
  const [email, setEmail] = useState('');
  const [tournamentSlug, setTournamentSlug] = useState('');
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');

  const handleModeChange = (newMode: string) => {
    if (mode !== newMode) {
      setMode(newMode as LoginMode);
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

  const tabItems = [
    {
      key: 'admin',
      label: (
        <span>
          <MailOutlined style={{ marginRight: 8 }} />
          {t('auth.login.adminTab')}
        </span>
      ),
    },
    {
      key: 'team',
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          {t('auth.login.teamTab')}
        </span>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <AntLanguageSwitcher />
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* ヘッダー */}
          <Space direction="vertical" size={4} style={{ width: '100%', textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              {t('auth.login.title')}
            </Title>
            <Text type="secondary">
              {t('auth.login.subtitle')}
            </Text>
          </Space>

          {/* モード切り替えタブ */}
          <Tabs
            activeKey={mode}
            onChange={handleModeChange}
            items={tabItems}
            centered
            size="large"
          />

          {/* フォーム */}
          <form onSubmit={handleSubmit}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* チームログイン情報 */}
              {mode === 'team' && (
                <Alert
                  message={t('auth.login.teamInfo')}
                  type="info"
                  showIcon
                />
              )}

              {/* エラーメッセージ */}
              {error && (
                <Alert
                  message={error}
                  type="error"
                  closable
                  onClose={() => setError(null)}
                />
              )}

              {/* 入力フィールド */}
              {mode === 'team' ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      {t('teamLoginForm.tournamentCodeLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
                    </label>
                    <Input
                      prefix={<TrophyOutlined />}
                      placeholder={t('teamLoginForm.tournamentCodeLabel')}
                      size="large"
                      value={tournamentSlug}
                      onChange={(e) => setTournamentSlug(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      {t('auth.login.teamNameLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
                    </label>
                    <Input
                      prefix={<TeamOutlined />}
                      placeholder={t('auth.login.teamNameLabel')}
                      size="large"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    {t('auth.login.emailLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
                  </label>
                  <Input
                    prefix={<MailOutlined />}
                    type="email"
                    placeholder={t('auth.login.emailLabel')}
                    size="large"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  {t('auth.login.passwordLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
                </label>
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('auth.login.passwordLabel')}
                  size="large"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="current-password"
                  required
                />
                {mode === 'team' && (
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    {t('auth.login.passwordHelperText')}
                  </Text>
                )}
              </div>

              {/* 送信ボタン */}
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
                disabled={mode === 'team' && teamName.trim().length === 0}
              >
                {submitting ? t('auth.login.submitting') : t('auth.login.submitButton')}
              </Button>

              {/* パスワードリセット（管理者のみ） */}
              {mode === 'admin' && (
                <Button
                  type="link"
                  onClick={onShowPasswordReset}
                  style={{ alignSelf: 'center' }}
                >
                  {t('auth.login.forgotPassword')}
                </Button>
              )}

              {/* 管理者作成セクション */}
              <Divider>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('auth.login.adminCreateSection')}
                </Text>
              </Divider>

              <Button
                onClick={() => setAdminDialogOpen(true)}
                disabled={submitting}
                block
              >
                {t('auth.login.adminCreateButton')}
              </Button>
            </Space>
          </form>

          {/* 管理者作成成功メッセージ */}
          {adminSuccess && (
            <Alert
              message={adminSuccess}
              type="success"
              closable
              onClose={() => setAdminSuccess(null)}
            />
          )}
        </Space>

        {/* 管理者作成ダイアログ */}
        <AdminCreateDialog
          open={adminDialogOpen}
          onClose={() => setAdminDialogOpen(false)}
          onCreated={(createdEmail) => {
            setAdminDialogOpen(false);
            setAdminSuccess(t('auth.login.adminCreatedSuccess', { email: createdEmail }));
          }}
        />
      </Card>
    </div>
  );
};

export default LoginForm;
