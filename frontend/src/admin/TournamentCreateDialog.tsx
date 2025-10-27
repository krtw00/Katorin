import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('tournament.create.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t('tournament.create.subtitle')}
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label={t('tournament.create.nameLabel')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
            fullWidth
            disabled={submitting}
          />
          <TextField
            label={t('tournament.create.slugLabel')}
            value={slugTouched ? slug : derivedSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder={t('tournament.create.slugPlaceholder')}
            helperText={t('tournament.create.slugHelperText')}
            fullWidth
            disabled={submitting}
          />
          <TextField
            label={t('tournament.create.descriptionLabel')}
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
          {t('tournament.create.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? t('tournament.create.submitting') : t('tournament.create.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TournamentCreateDialog;
