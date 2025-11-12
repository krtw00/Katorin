import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Space,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { useTeamApi } from '../team/useTeamApi';
import type { MatchRecord } from '../types/matchTypes';
import dayjs from 'dayjs';

type Participant = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  match: MatchRecord | null;
  participants: Participant[];
  onClose: () => void;
  onUpdated: (match: MatchRecord) => void;
};

const ensureDateInputValue = (value?: string | null) => {
  if (!value) return '';
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toISODateString = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }
  const withTime = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(withTime.getTime()) ? null : withTime.toISOString();
};

const MatchEditDialog: React.FC<Props> = ({ open, match, participants, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const teamApi = useTeamApi();
  const [playerName, setPlayerName] = useState('');
  const [playerInput, setPlayerInput] = useState('');
  const [selfScore, setSelfScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [opponentPlayer, setOpponentPlayer] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timezone, setTimezone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) {
      setPlayerName('');
      setPlayerInput('');
      setSelfScore('');
      setOpponentScore('');
      setOpponentTeam('');
      setOpponentPlayer('');
      setDateValue('');
      setTimezone('');
      setError(null);
      return;
    }
    setPlayerName(match.player ?? '');
    setPlayerInput(match.player ?? '');
    setSelfScore(match.selfScore ?? '');
    setOpponentScore(match.opponentScore ?? '');
    setOpponentTeam(match.opponentTeam ?? '');
    setOpponentPlayer(match.opponentPlayer ?? '');
    setDateValue(ensureDateInputValue(match.date));
    setTimezone(match.timezone ?? '');
    setError(null);
  }, [open, match]);

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.name === playerName) ?? null,
    [participants, playerName],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!match) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        player: playerName,
        selfScore,
        opponentScore,
        opponentTeam,
        opponentPlayer,
      };
      const isoDate = toISODateString(dateValue);
      if (isoDate) {
        body.date = isoDate;
      }
      if (timezone) {
        body.timezone = timezone;
      }
      const response = await teamApi(`/api/team/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = (await response.text()) || t('matchManager.teamUpdateFailed');
        throw new Error(message);
      }
      const updatedMatch: MatchRecord = await response.json();
      onUpdated(updatedMatch);
      onClose();
    } catch (e: any) {
      setError(e?.message || t('matchManager.teamUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('matchManager.teamEditTitle')}
      open={open}
      onCancel={submitting ? undefined : onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          {t('matchManager.teamCancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
        >
          {submitting ? t('matchManager.teamSaving') : t('matchManager.teamSave')}
        </Button>,
      ]}
      width={640}
    >
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {error && <Alert type="error" message={error} />}
          <Form.Item label={t('matchManager.teamPlayerLabel')}>
            <AutoComplete
              value={playerInput}
              onChange={(value) => {
                setPlayerInput(value);
                setPlayerName(value);
              }}
              onSelect={(value) => {
                const participant = participants.find((p) => p.name === value);
                const name = participant?.name ?? value;
                setPlayerName(name);
                setPlayerInput(name);
              }}
              options={participants.map((p) => ({ value: p.name }))}
              placeholder={t('matchManager.teamPlayerLabel')}
            />
          </Form.Item>
          <Flex gap={16}>
            <Form.Item
              label={t('matchManager.teamSelfScoreLabel')}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                value={selfScore}
                onChange={(e) => setSelfScore(e.target.value)}
                type="number"
              />
            </Form.Item>
            <Form.Item
              label={t('matchManager.teamOpponentScoreLabel')}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                value={opponentScore}
                onChange={(e) => setOpponentScore(e.target.value)}
                type="number"
              />
            </Form.Item>
          </Flex>
          <Form.Item label={t('matchManager.teamOpponentTeamLabel')}>
            <Input
              value={opponentTeam}
              onChange={(e) => setOpponentTeam(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={t('matchManager.teamOpponentPlayerLabel')}>
            <Input
              value={opponentPlayer}
              onChange={(e) => setOpponentPlayer(e.target.value)}
            />
          </Form.Item>
          <Flex gap={16}>
            <Form.Item
              label={t('matchManager.teamDateLabel')}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <DatePicker
                value={dateValue ? dayjs(dateValue) : null}
                onChange={(date) =>
                  setDateValue(date ? date.format('YYYY-MM-DD') : '')
                }
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
            <Form.Item
              label={t('matchManager.teamTimezoneLabel')}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
              />
            </Form.Item>
          </Flex>
        </Space>
      </Form>
    </Modal>
  );
};

export default MatchEditDialog;
