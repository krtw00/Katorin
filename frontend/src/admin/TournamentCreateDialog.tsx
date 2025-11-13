import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Input, Modal, Space, Typography } from 'antd';
import { TrophyOutlined, LinkOutlined } from '@ant-design/icons';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

const { TextArea } = Input;
const { Text: TypographyText } = Typography;

export type Tournament = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

type TournamentCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (tournament: Tournament) => void;
};

const slugify = (raw: string) =>
  raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 大会作成ダイアログ（Ant Design版）
 * 新しい大会を作成
 */
const TournamentCreateDialog: React.FC<TournamentCreateDialogProps> = ({ open, onClose, onCreated }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setDescription('');
      setError(null);
      setSubmitting(false);
      setSlugTouched(false);
    }
  }, [open]);

  const derivedSlug = useMemo(() => {
    if (slugTouched) {
      return slug;
    }
    return slugify(name);
  }, [name, slug, slugTouched]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = derivedSlug.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError(t('tournament.create.errorNameRequired'));
      return;
    }
    if (!trimmedSlug || !slugPattern.test(trimmedSlug)) {
      setError(t('tournament.create.errorSlugInvalid'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await authFetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
          description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
        }),
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? t('tournament.create.errorFailed')
          : await response.text();
        throw new Error(message || t('tournament.create.errorFailed'));
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('tournament.create.errorInvalidResponse'));
      }
      const tournament: Tournament = await response.json();
      onCreated?.(tournament);
    } catch (err) {
      console.error('Failed to create tournament:', err);
      setError(err instanceof Error ? err.message : t('tournament.create.errorFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('tournament.create.title')}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={submitting ? t('tournament.create.submitting') : t('tournament.create.submit')}
      cancelText={t('tournament.create.cancel')}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      keyboard={!submitting}
      width={560}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 24 }}>
        <TypographyText type="secondary">
          {t('tournament.create.subtitle')}
        </TypographyText>

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
            {t('tournament.create.nameLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
          </label>
          <Input
            prefix={<TrophyOutlined />}
            placeholder={t('tournament.create.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('tournament.create.slugLabel')} <span style={{ color: '#ff4d4f' }}>*</span>
          </label>
          <Input
            prefix={<LinkOutlined />}
            placeholder={t('tournament.create.slugPlaceholder')}
            value={slugTouched ? slug : derivedSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            disabled={submitting}
          />
          <TypographyText type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {t('tournament.create.slugHelperText')}
          </TypographyText>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('tournament.create.descriptionLabel')}
          </label>
          <TextArea
            placeholder={t('tournament.create.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default TournamentCreateDialog;
