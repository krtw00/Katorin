import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Space, Typography, Row, Col } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  LogoutOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useAuth } from '../auth/AuthContext';
import TournamentCreateDialog, { Tournament } from './TournamentCreateDialog';
import AntLanguageSwitcher from '../components/AntLanguageSwitcher';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const { Title, Text, Paragraph } = Typography;

type TournamentSelectionProps = {
  onSelect: (tournament: Tournament) => void;
  onCancel?: () => void;
};

/**
 * 大会選択コンポーネント（Ant Design版）
 * 大会一覧を表示し、選択または新規作成を行う
 */
const TournamentSelection: React.FC<TournamentSelectionProps> = ({ onSelect, onCancel }) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const { signOut } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/tournaments');
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('tournament.selection.errorInvalidResponse'));
      }
      const data: Tournament[] = await response.json();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError(t('tournament.selection.errorFailed'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) => {
        const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (Number.isNaN(dateDiff)) {
          return b.name.localeCompare(a.name, 'ja');
        }
        return dateDiff;
      }),
    [tournaments],
  );

  const handleSelect = (tournament: Tournament) => {
    onSelect(tournament);
  };

  const handleCreated = (tournament: Tournament) => {
    setTournaments((prev) => {
      const exists = prev.some((item) => item.id === tournament.id);
      if (exists) {
        return prev.map((item) => (item.id === tournament.id ? tournament : item));
      }
      return [tournament, ...prev];
    });
    setDialogOpen(false);
    setInfoMessage(t('tournament.selection.created', { name: tournament.name }));
    onSelect(tournament);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          maxWidth: 1200,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <AntLanguageSwitcher />
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* ヘッダー */}
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              {t('tournament.selection.title')}
            </Title>
            <Text type="secondary">
              {t('tournament.selection.subtitle')}
            </Text>
          </div>

          {/* 成功・エラーメッセージ */}
          {infoMessage && (
            <Alert
              message={infoMessage}
              type="success"
              closable
              onClose={() => setInfoMessage(null)}
            />
          )}
          {error && (
            <Alert
              message={error}
              type="error"
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* アクションボタン */}
          <Row gutter={[16, 16]} justify="space-between">
            <Col xs={24} sm={12}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setDialogOpen(true);
                    setInfoMessage(null);
                  }}
                >
                  {t('tournament.selection.createButton')}
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadTournaments}
                  loading={loading}
                >
                  {t('tournament.selection.refreshButton')}
                </Button>
              </Space>
            </Col>
            <Col xs={24} sm={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space wrap>
                {onCancel && (
                  <Button onClick={onCancel}>
                    {t('tournament.selection.backButton')}
                  </Button>
                )}
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                >
                  {t('tournament.selection.logoutButton')}
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 大会一覧 */}
          {loading ? (
            <LoadingSpinner fullscreen={false} tip={t('tournament.selection.loading')} />
          ) : sortedTournaments.length === 0 ? (
            <EmptyState
              message={t('tournament.selection.noTournaments')}
              description={t('tournament.selection.noTournamentsDescription', '大会を作成してください')}
              actionText={t('tournament.selection.createButton')}
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {sortedTournaments.map((tournament) => (
                <Col xs={24} sm={12} lg={8} key={tournament.id}>
                  <Card
                    hoverable
                    style={{
                      height: '100%',
                      borderColor: '#d3dcff',
                      backgroundColor: '#f8faff',
                    }}
                    bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                  >
                    <Space direction="vertical" size="small" style={{ flex: 1, width: '100%' }}>
                      <div>
                        <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
                          <TrophyOutlined style={{ marginRight: 8, color: '#007AFF' }} />
                          {tournament.name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {tournament.slug}
                        </Text>
                      </div>

                      {tournament.description && (
                        <Paragraph
                          type="secondary"
                          style={{ marginBottom: 0, fontSize: 13 }}
                          ellipsis={{ rows: 2 }}
                        >
                          {tournament.description}
                        </Paragraph>
                      )}

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('tournament.selection.createdAt')}{' '}
                        {new Date(tournament.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>

                      <Button
                        type="primary"
                        block
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                        onClick={() => handleSelect(tournament)}
                        style={{ marginTop: 'auto' }}
                      >
                        {t('tournament.selection.selectButton')}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Space>
      </Card>

      <TournamentCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default TournamentSelection;
