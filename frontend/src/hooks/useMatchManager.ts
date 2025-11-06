import { useState, useCallback } from 'react';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';
import { useTranslation } from 'react-i18next';
import type { MatchRecord } from '../types/matchTypes';

type Round = {
  id: string;
  tournament_id: string;
  number: number;
  title?: string | null;
  status: 'open' | 'closed';
  created_at: string;
  closed_at?: string | null;
};

interface Team {
  id: string;
  name: string;
}

export const useMatchManager = (tournamentId: string) => {
  const { t } = useTranslation();
  const authFetch = useAuthorizedFetch();

  // State
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = useState<boolean>(true);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      const response = await authFetch('/api/teams');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('matchManager.fetchTeamsError'));
      }
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setError(err.message || t('matchManager.fetchTeamsError'));
    }
  }, [authFetch, t]);

  // Load rounds
  const loadRounds = useCallback(async () => {
    setRoundsLoading(true);
    setRoundError(null);
    try {
      const response = await authFetch(`/api/tournaments/${tournamentId}/rounds`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      const data: Round[] = await response.json();
      setRounds(data);
      setSelectedRoundId((prev) => {
        if (prev && data.some((round) => round.id === prev)) {
          return prev;
        }
        const openRound = [...data].reverse().find((round) => round.status !== 'closed');
        const fallback = data.length > 0 ? data[data.length - 1] : null;
        return (openRound ?? fallback)?.id ?? null;
      });
    } catch (err) {
      console.error('Failed to load rounds:', err);
      setRoundError(t('matchManager.fetchRoundsFailed'));
    } finally {
      setRoundsLoading(false);
    }
  }, [authFetch, tournamentId, t]);

  // Load matches
  const loadMatches = useCallback(async () => {
    if (!selectedRoundId) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('tournamentId', tournamentId);
      if (selectedRoundId) {
        params.set('roundId', selectedRoundId);
      }
      const response = await authFetch(`/api/matches?${params.toString()}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const message = contentType.includes('application/json')
          ? (await response.json()).error ?? `HTTP ${response.status}`
          : await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error(t('matchManager.serverError'));
      }
      const data: MatchRecord[] = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError(t('matchManager.fetchMatchesFailed'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, tournamentId, selectedRoundId, t]);

  // Delete match
  const deleteMatch = useCallback(async (matchId: string) => {
    try {
      const response = await authFetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('matchManager.deleteMatchFailed'));
      }
      return true;
    } catch (err: any) {
      console.error('Failed to delete match:', err);
      throw err;
    }
  }, [authFetch, t]);

  // Create round
  const createRound = useCallback(async (title: string) => {
    try {
      const response = await authFetch(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('matchManager.createRoundFailed'));
      }
      return data;
    } catch (err: any) {
      console.error('Failed to create round:', err);
      throw err;
    }
  }, [authFetch, tournamentId, t]);

  return {
    // State
    matches,
    setMatches,
    loading,
    error,
    setError,
    rounds,
    roundsLoading,
    roundError,
    selectedRoundId,
    setSelectedRoundId,
    teams,
    // Actions
    fetchTeams,
    loadRounds,
    loadMatches,
    deleteMatch,
    createRound,
  };
};
