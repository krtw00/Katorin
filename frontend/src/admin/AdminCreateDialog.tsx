import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Input, Modal, Space, Typography } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

const { Text } = Typography;

type AdminCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (email: string) => void;
};

/**
 * 管理者作成ダイアログ（Ant Design版）
 * 新しい管理者ユーザーを作成
 */
const AdminCreateDialog: React.FC<AdminCreateDialogProps> = ({ open, onClose, onCreated }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
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
    <Modal
      title={t('admin.create.title')}
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText={submitting ? t('admin.create.submitting') : t('admin.create.submit')}
      cancelText={t('admin.create.cancel')}
      confirmLoading={submitting}
      okButtonProps={{ disabled: isDisabled }}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      keyboard={!submitting}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 24 }}>
        <Text type="secondary">
          {t('admin.create.subtitle')}
        </Text>

        {error && (
          <Alert
            message={error}
            type="error"
            closable
            onClose={() => setError(null)}
          />
        )}

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('admin.create.emailLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
          </label>
          <Input
            prefix={<MailOutlined />}
            type="email"
            placeholder={t('admin.create.emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('admin.create.passwordLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
          </label>
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('admin.create.passwordLabel')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {t('admin.create.passwordHelperText', '6文字以上')}
          </Text>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('admin.create.displayNameLabel')}
          </label>
          <Input
            prefix={<UserOutlined />}
            placeholder={t('admin.create.displayNameLabel')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={submitting}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default AdminCreateDialog;
