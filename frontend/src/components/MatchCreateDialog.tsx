import React, { useCallback, useEffect, useState } from 'react';
import { Alert, DatePicker, Flex, Form, Modal, Select, Space, Spin, Typography } from 'antd';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Text } = Typography;

type MatchRecord = {
  id: string;
  team?: string | null;
  player?: string | null;
  deck?: string | null;
  selfScore?: string | null;
  opponentScore?: string | null;
  opponentTeam?: string | null;
  opponentPlayer?: string | null;
  opponentDeck?: string | null;
  date?: string | null;
  created_at?: string | null;
  tournament_id?: string | null;
  round_id?: string | null;
};

type MatchFormValues = {
  teamId: string | null;
  opponentTeamId: string | null;
  date: string;
};

interface Team {
  id: string;
  name: string;
}

const createInitialValues = (): MatchFormValues => ({
  teamId: null,
  opponentTeamId: null,
  date: '',
});

type MatchCreateDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  match: MatchRecord | null;
  onClose: () => void;
  onCompleted: (mode: 'create' | 'edit') => void;
  tournamentId: string;
  roundId: string | null;
};

const MatchCreateDialog: React.FC<MatchCreateDialogProps> = ({
  open,
  mode,
  match,
  onClose,
  onCompleted,
  tournamentId,
  roundId,
}) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MatchFormValues>(createInitialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const authFetch = useAuthorizedFetch();

  const fetchTeams = useCallback(async () => {
    if (!tournamentId) {
      setError(t('matchCreateDialog.fetchTeamsError'));
      setTeamsLoading(false);
      return;
    }
    setTeamsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('tournament_id', tournamentId);
      const response = await authFetch(`/api/teams?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('matchCreateDialog.fetchTeamsError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setError(err.message || t('matchCreateDialog.fetchTeamsError'));
    } finally {
      setTeamsLoading(false);
    }
  }, [authFetch, t, tournamentId]);

  useEffect(() => {
    if (open) {
      fetchTeams();
      if (mode === 'edit' && match) {
        setValues({
          teamId: match.team ?? null,
          opponentTeamId: match.opponentTeam ?? null,
          date: match.date ? match.date.slice(0, 10) : '',
        });
      } else {
        setValues(createInitialValues());
      }
      setError(null);
    }
  }, [open, mode, match, fetchTeams]);

  const handleSubmit = async () => {
    const targetRoundId = effectiveRoundId;
    if (!targetRoundId) {
      setError(t('matchCreateDialog.roundNotSelected'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        team: values.teamId,
        opponentTeam: values.opponentTeamId,
        date: values.date ? values.date : null,
        tournamentId,
        roundId: targetRoundId,
      };

      if (mode === 'edit' && match) {
        const response = await authFetch(`/api/matches/${match.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        await response.json();
        onCompleted('edit');
      } else {
        const response = await authFetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        await response.json();
        onCompleted('create');
      }
    } catch (err) {
      console.error('Error creating match:', err);
      setError(
        err instanceof Error
          ? err.message
          : mode === 'edit'
          ? t('matchCreateDialog.updateFailed')
          : t('matchCreateDialog.createFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveRoundId = roundId ?? match?.round_id ?? null;
  const hasRoundContext = Boolean(effectiveRoundId);
  const isSubmitDisabled =
    submitting || teamsLoading || !hasRoundContext || values.teamId === '' || values.opponentTeamId === '';

  const dialogTitle = mode === 'edit' ? t('matchCreateDialog.editMatch') : t('matchCreateDialog.createMatch');

  return (
    <Modal
      title={dialogTitle}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={
        submitting
          ? mode === 'edit'
            ? t('common.updating')
            : t('common.creating')
          : mode === 'edit'
          ? t('common.update')
          : t('common.create')
      }
      cancelText={t('common.cancel')}
      confirmLoading={submitting}
      okButtonProps={{ disabled: isSubmitDisabled }}
      width={640}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {error && <Alert type="error" message={error} />}
        {teamsLoading ? (
          <Flex justify="center" style={{ padding: '16px 0' }}>
            <Spin />
          </Flex>
        ) : teams.length === 0 ? (
          <Alert type="warning" message={t('matchCreateDialog.noTeamsRegistered')} />
        ) : (
          <>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {mode === 'create'
                ? t('matchCreateDialog.createMatchDescription')
                : t('matchCreateDialog.editMatchDescription')}
            </Text>
            <Form layout="vertical">
              <Flex gap={16} wrap="wrap">
                <Form.Item
                  label={t('matchCreateDialog.homeTeam')}
                  required
                  style={{ flex: '1 1 280px', marginBottom: 0 }}
                >
                  <Select
                    placeholder={t('matchCreateDialog.selectTeam')}
                    value={values.teamId || undefined}
                    onChange={(value) =>
                      setValues((prev) => ({ ...prev, teamId: value }))
                    }
                    style={{ width: '100%' }}
                    options={teams
                      .filter((team) => team.id !== values.opponentTeamId)
                      .map((team) => ({ value: team.id, label: team.name }))}
                  />
                </Form.Item>
                <Form.Item
                  label={t('matchCreateDialog.awayTeam')}
                  required
                  style={{ flex: '1 1 280px', marginBottom: 0 }}
                >
                  <Select
                    placeholder={t('matchCreateDialog.selectTeam')}
                    value={values.opponentTeamId || undefined}
                    onChange={(value) =>
                      setValues((prev) => ({ ...prev, opponentTeamId: value }))
                    }
                    style={{ width: '100%' }}
                    options={teams
                      .filter((team) => team.id !== values.teamId)
                      .map((team) => ({ value: team.id, label: team.name }))}
                  />
                </Form.Item>
              </Flex>
              <Form.Item label={t('matchCreateDialog.matchDate')} style={{ marginTop: 16 }}>
                <DatePicker
                  value={values.date ? dayjs(values.date) : null}
                  onChange={(date) =>
                    setValues((prev) => ({
                      ...prev,
                      date: date ? date.format('YYYY-MM-DD') : '',
                    }))
                  }
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default MatchCreateDialog;
