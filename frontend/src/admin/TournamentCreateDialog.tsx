import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

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

const TournamentCreateDialog: React.FC<TournamentCreateDialogProps> = ({ open, onClose, onCreated }) => {
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
      setError('大会名を入力してください。');
      return;
    }
    if (!trimmedSlug || !slugPattern.test(trimmedSlug)) {
      setError('スラッグは半角英数字とハイフンのみ使用してください。');
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
          ? (await response.json()).error ?? '大会の作成に失敗しました。'
          : await response.text();
        throw new Error(message || '大会の作成に失敗しました。');
      }
      if (!contentType.includes('application/json')) {
        throw new Error('サーバーが不正なレスポンスを返しました。');
      }
      const tournament: Tournament = await response.json();
      onCreated?.(tournament);
    } catch (err) {
      console.error('Failed to create tournament:', err);
      setError(err instanceof Error ? err.message : '大会の作成に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>大会を作成</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            大会コード（スラッグ）はメールアドレスのドメインとしても使用されます。半角英数字とハイフンで入力してください。
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="大会名"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
            fullWidth
            disabled={submitting}
          />
          <TextField
            label="大会コード（スラッグ）"
            value={slugTouched ? slug : derivedSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="例: 2025-spring-league"
            helperText="半角英数とハイフンのみ。空欄のままでも大会名から自動生成されます。"
            fullWidth
            disabled={submitting}
          />
          <TextField
            label="説明 (任意)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={submitting}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? '作成中…' : '作成する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TournamentCreateDialog;
