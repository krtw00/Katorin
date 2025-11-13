import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Button,
  Card,
  Table,
  Input,
  Space,
  Typography,
  Row,
  Col,
  Tooltip,
  Flex,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';
import type { Tournament } from './admin/TournamentCreateDialog';

const { Title } = Typography;

type MatchRecord = {
  id: string;
  team: string;
  player: string;
  deck: string;
  selfScore: string;
  opponentScore: string;
  opponentTeam: string;
  opponentPlayer: string;
  opponentDeck: string;
  date: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type MatchRecordFormValues = Omit<MatchRecord, 'id'>;

const groupStyles = {
  self: {
    headerBg: 'rgba(70, 124, 224, 0.35)',
    headerColor: '#e0ecff',
    cellBg: 'rgba(70, 124, 224, 0.1)',
  },
  opponent: {
    headerBg: 'rgba(224, 86, 70, 0.35)',
    headerColor: '#ffe1e1',
    cellBg: 'rgba(224, 86, 70, 0.2)',
  },
} satisfies Record<'self' | 'opponent', { headerBg: string; headerColor: string; cellBg: string }>;

const emptyValues: MatchRecordFormValues = {
  team: '',
  player: '',
  deck: '',
  selfScore: '',
  opponentScore: '',
  opponentTeam: '',
  opponentPlayer: '',
  opponentDeck: '',
  date: '',
};

type RecordModalProps = {
  open: boolean;
  initialValues: MatchRecordFormValues;
  mode: 'create' | 'edit';
  onSave: (values: MatchRecordFormValues) => void;
  onClose: () => void;
};

const RecordModal: React.FC<RecordModalProps> = ({ open, initialValues, mode, onSave, onClose }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MatchRecordFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [open, initialValues]);

  const handleChange =
    (field: keyof MatchRecordFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (field === 'selfScore' || field === 'opponentScore') {
        const numeric = value.replace(/[^\d]/g, '');
        setValues((prev) => ({ ...prev, [field]: numeric }));
      } else {
        setValues((prev) => ({ ...prev, [field]: value }));
      }
    };

  const handleSubmit = () => {
    onSave(values);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={mode === 'create' ? t('duelInput.addRecord') : t('duelInput.editRecord')}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('duelInput.cancel')}
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {mode === 'create' ? t('duelInput.add') : t('duelInput.update')}
        </Button>,
      ]}
    >
      <div style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#6f9dff', marginBottom: 4, display: 'block' }}>
                {t('duelInput.team')}
              </label>
              <Input
                value={values.team}
                onChange={handleChange('team')}
                style={{ backgroundColor: 'rgba(70, 124, 224, 0.12)' }}
                autoFocus
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#d46060', marginBottom: 4, display: 'block' }}>
                {t('duelInput.team')}
              </label>
              <Input
                value={values.opponentTeam}
                onChange={handleChange('opponentTeam')}
                style={{ backgroundColor: 'rgba(224, 86, 70, 0.18)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#6f9dff', marginBottom: 4, display: 'block' }}>
                {t('duelInput.player')}
              </label>
              <Input
                value={values.player}
                onChange={handleChange('player')}
                style={{ backgroundColor: 'rgba(70, 124, 224, 0.12)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#d46060', marginBottom: 4, display: 'block' }}>
                {t('duelInput.player')}
              </label>
              <Input
                value={values.opponentPlayer}
                onChange={handleChange('opponentPlayer')}
                style={{ backgroundColor: 'rgba(224, 86, 70, 0.18)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#6f9dff', marginBottom: 4, display: 'block' }}>
                {t('duelInput.deck')}
              </label>
              <Input
                value={values.deck}
                onChange={handleChange('deck')}
                style={{ backgroundColor: 'rgba(70, 124, 224, 0.12)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#d46060', marginBottom: 4, display: 'block' }}>
                {t('duelInput.deck')}
              </label>
              <Input
                value={values.opponentDeck}
                onChange={handleChange('opponentDeck')}
                style={{ backgroundColor: 'rgba(224, 86, 70, 0.18)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#6f9dff', marginBottom: 4, display: 'block' }}>
                {t('duelInput.score')}
              </label>
              <Input
                value={values.selfScore}
                onChange={handleChange('selfScore')}
                type="number"
                style={{ backgroundColor: 'rgba(70, 124, 224, 0.12)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#d46060', marginBottom: 4, display: 'block' }}>
                {t('duelInput.score')}
              </label>
              <Input
                value={values.opponentScore}
                onChange={handleChange('opponentScore')}
                type="number"
                style={{ backgroundColor: 'rgba(224, 86, 70, 0.18)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ marginBottom: 4, display: 'block' }}>{t('duelInput.date')}</label>
              <Input type="date" value={values.date} onChange={handleChange('date')} />
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

const DuelInput: React.FC = () => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();
  const defaultTournamentId = process.env.REACT_APP_DEFAULT_TOURNAMENT_ID ?? null;
  const [tournamentId, setTournamentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return defaultTournamentId;
    }
    return window.localStorage.getItem('katorin:selectedTournamentId') ?? defaultTournamentId;
  });
  const [roundId, setRoundId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('katorin:selectedRoundId');
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleTournamentChange = (event: Event) => {
      const detail = (event as CustomEvent<Tournament | undefined>).detail;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        setTournamentId(detail.id as string);
      }
    };
    const handleTournamentClear = () => {
      setTournamentId(defaultTournamentId ?? null);
    };
    const handleRoundChange = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string } | undefined>).detail;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        setRoundId(detail.id as string);
      }
    };
    const handleRoundClear = () => {
      setRoundId(null);
    };
    window.addEventListener('katorin:tournamentChanged', handleTournamentChange as EventListener);
    window.addEventListener('katorin:tournamentCleared', handleTournamentClear);
    window.addEventListener('katorin:roundChanged', handleRoundChange as EventListener);
    window.addEventListener('katorin:roundCleared', handleRoundClear);
    return () => {
      window.removeEventListener('katorin:tournamentChanged', handleTournamentChange as EventListener);
      window.removeEventListener('katorin:tournamentCleared', handleTournamentClear);
      window.removeEventListener('katorin:roundChanged', handleRoundChange as EventListener);
      window.removeEventListener('katorin:roundCleared', handleRoundClear);
    };
  }, [defaultTournamentId]);
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [modalState, setModalState] = useState<{ open: boolean; mode: 'create' | 'edit'; targetId?: string }>({
    open: false,
    mode: 'create',
  });
  const [confirmState, setConfirmState] = useState<{ open: boolean; targetId?: string }>({ open: false });

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        if (!tournamentId) {
          setRecords([]);
          return;
        }
        const params = new URLSearchParams({ tournamentId });
        if (roundId) {
          params.set('roundId', roundId);
        }
        const response = await authFetch(`/api/matches?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setRecords(data);
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();
  }, [authFetch, tournamentId, roundId]);

  const modalInitialValues = useMemo<MatchRecordFormValues>(() => {
    if (modalState.mode === 'edit' && modalState.targetId) {
      const target = records.find((record) => record.id === modalState.targetId);
      if (target) {
        const { id, ...rest } = target;
        return rest;
      }
    }
    return emptyValues;
  }, [modalState.mode, modalState.targetId, records]);

  const columns: Array<{ key: keyof MatchRecordFormValues; label: string; align?: 'center' | 'right'; group?: 'self' | 'opponent' }> = [
    { key: 'team', label: t('duelInput.team'), group: 'self' },
    { key: 'player', label: t('duelInput.player'), group: 'self' },
    { key: 'deck', label: t('duelInput.deck'), group: 'self' },
    { key: 'selfScore', label: t('duelInput.score'), align: 'center', group: 'self' },
    { key: 'opponentScore', label: t('duelInput.score'), align: 'center', group: 'opponent' },
    { key: 'opponentDeck', label: t('duelInput.deck'), group: 'opponent' },
    { key: 'opponentPlayer', label: t('duelInput.player'), group: 'opponent' },
    { key: 'opponentTeam', label: t('duelInput.team'), group: 'opponent' },
    { key: 'date', label: t('duelInput.date'), align: 'center' },
  ];

  const openCreateModal = () => {
    setModalState({ open: true, mode: 'create' });
  };

  const openEditModal = (id: string) => {
    setModalState({ open: true, mode: 'edit', targetId: id });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false, targetId: undefined }));
  };

  const handleDelete = (id: string) => {
    setConfirmState({ open: true, targetId: id });
  };

  const closeConfirm = () => setConfirmState({ open: false });

  const confirmDelete = async () => {
    if (confirmState.targetId) {
      try {
        const response = await authFetch(`/api/matches/${confirmState.targetId}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        setRecords((prev) => prev.filter((record) => record.id !== confirmState.targetId));
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
    closeConfirm();
  };

  const handleModalSave = async (values: MatchRecordFormValues) => {
    if (modalState.mode === 'edit' && modalState.targetId) {
      try {
        const response = await authFetch(`/api/matches/${modalState.targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const updatedRecord: MatchRecord = await response.json();
        setRecords((prev) => prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record)));
      } catch (error) {
        console.error('Error updating record:', error);
      }
    } else {
      try {
        if (!tournamentId || !roundId) {
          throw new Error(t('duelInput.noTournamentOrRound'));
        }
        const response = await authFetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, tournamentId, roundId }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const newRecord: MatchRecord = await response.json();
        setRecords((prev) => [newRecord, ...prev]);
      } catch (error) {
        console.error('Error creating record:', error);
      }
    }
    closeModal();
  };

  return (
    <Card
      style={{
        padding: '24px 32px',
        borderRadius: 16,
        background: 'linear-gradient(180deg, #12172b 0%, #0b0d18 100%)',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontWeight: 800, letterSpacing: '0.08em', margin: 0, color: '#fff' }}>
          {t('duelInput.matchRecordList')}
        </Title>
        <Button type="primary" onClick={openCreateModal}>
          {t('duelInput.addRecord')}
        </Button>
      </Flex>

      <div style={{ overflowX: 'auto' }}>
        <Table
          size="small"
          dataSource={records.length === 0 ? [] : records}
          columns={[
            ...columns.map((column) => {
              const style = column.group ? groupStyles[column.group] : undefined;
              const isScore = column.key === 'selfScore' || column.key === 'opponentScore';
              const isOpponentGroup = column.group === 'opponent';

              return {
                title: (
                  <div
                    style={{
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: style?.headerBg,
                      color: style?.headerColor || '#e2e4ff',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {column.label}
                  </div>
                ),
                dataIndex: column.key,
                key: column.key,
                align: column.align || ('left' as const),
                onCell: () => ({
                  style: {
                    backgroundColor: style?.cellBg,
                    fontWeight: isScore ? 700 : 500,
                    fontSize: isScore ? 18 : undefined,
                    color: isOpponentGroup ? '#ffd3d0' : '#f3f3f3',
                  },
                }),
                render: (value: string) => (value === '' || value === null ? '-' : value),
              };
            }),
            {
              title: t('duelInput.action'),
              key: 'action',
              align: 'center' as const,
              render: (_: unknown, record: MatchRecord) => (
                <Space size="small">
                  <Tooltip title={t('duelInput.editRecord')}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(record.id)}
                    />
                  </Tooltip>
                  <Tooltip title={t('duelInput.delete')}>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.id)}
                    />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
          locale={{
            emptyText: (
              <div style={{ padding: '48px 0', color: 'rgba(255,255,255,0.6)' }}>
                {t('duelInput.noRecords')}
              </div>
            ),
          }}
          pagination={false}
          style={{ minWidth: 960 }}
        />
      </div>

      <RecordModal
        open={modalState.open}
        mode={modalState.mode}
        initialValues={modalInitialValues}
        onSave={handleModalSave}
        onClose={closeModal}
      />
      <Modal
        open={confirmState.open}
        onCancel={closeConfirm}
        title={t('duelInput.deleteConfirmation')}
        width={400}
        footer={[
          <Button key="cancel" onClick={closeConfirm}>
            {t('duelInput.cancel')}
          </Button>,
          <Button key="delete" danger type="primary" onClick={confirmDelete}>
            {t('duelInput.delete')}
          </Button>,
        ]}
      >
        <div>{t('duelInput.deleteConfirmationMessage')}</div>
      </Modal>
    </Card>
  );
};

export default DuelInput;
