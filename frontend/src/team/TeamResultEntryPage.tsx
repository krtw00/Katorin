import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Space, Typography, Input, Button, Alert, Tag, Card, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import ResultEntryGuard, { postTeamMatchResult } from './ResultEntryGuard';

const { Title } = Typography;

const TeamResultEntryPage: React.FC = () => {
  const { t } = useTranslation();
  const { matchId } = useParams();
  const navigate = useNavigate();
  const authFetch = useAuthorizedFetch();
  const teamId = (typeof window !== 'undefined' && localStorage.getItem('team_id')) || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<any | null>(null);
  const [selfScore, setSelfScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!matchId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/matches/${matchId}`);
        if (!res.ok) throw new Error((await res.text()) || 'failed');
        const data = await res.json();
        if (!cancelled) {
          setMatch(data);
          setSelfScore(data?.selfScore ?? '');
          setOpponentScore(data?.opponentScore ?? '');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, matchId]);

  const handleAction = async (action: 'save' | 'finalize' | 'cancel') => {
    if (!matchId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = action === 'cancel' ? undefined : { selfScore, opponentScore };
      const updated = await postTeamMatchResult(authFetch, matchId, action, payload);
      setMatch(updated);
      if (action !== 'cancel') {
        setSelfScore(updated?.selfScore ?? '');
        setOpponentScore(updated?.opponentScore ?? '');
      }
      if (action === 'finalize') {
        navigate('/matches');
      }
    } catch (e: any) {
      setError(e?.message || 'failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <Title level={3} style={{ fontWeight: 'bold', marginBottom: 16 }}>
        {t('teamResultEntry.title')}
      </Title>
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spin size="large" />
        </div>
      ) : match ? (
        <ResultEntryGuard
          matchId={matchId as string}
          teamId={teamId}
          fallback={<Alert message={t('teamResultEntry.viewOnly')} type="info" showIcon />}
        >
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space size="small">
                {match.result_status === 'finalized' ? (
                  <Tag color="success">{t('teamResultEntry.finalized')}</Tag>
                ) : (
                  <Tag>{t('teamResultEntry.draft')}</Tag>
                )}
              </Space>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <label>{t('teamResultEntry.selfScore')}</label>
                  <Input
                    value={selfScore}
                    onChange={(e) => setSelfScore(e.target.value)}
                    inputMode="numeric"
                    size="large"
                  />
                </Space>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <label>{t('teamResultEntry.opponentScore')}</label>
                  <Input
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    inputMode="numeric"
                    size="large"
                  />
                </Space>
              </Space>
              <Space size="small" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/matches')}>
                  {t('teamResultEntry.backToList')}
                </Button>
                <Button disabled={saving} onClick={() => handleAction('cancel')}>
                  {t('teamResultEntry.cancel')}
                </Button>
                <Button
                  disabled={saving}
                  type="primary"
                  onClick={() => handleAction('save')}
                >
                  {t('teamResultEntry.save')}
                </Button>
                <Button
                  disabled={saving}
                  type="primary"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleAction('finalize')}
                >
                  {t('teamResultEntry.finalize')}
                </Button>
              </Space>
            </Space>
          </Card>
        </ResultEntryGuard>
      ) : null}
    </div>
  );
};

export default TeamResultEntryPage;
