import { useState, useCallback } from 'react';
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch';

type Team = {
  id: string;
  name: string;
};

type MatchRecord = {
  id: string;
  team: string | null;
  player: string | null;
  deck: string | null;
  selfScore: string | null;
  opponentScore: string | null;
  opponentTeam: string | null;
  opponentPlayer: string | null;
  opponentDeck: string | null;
  date: string | null;
};

export const useResultEntry = (matchId: string | null, tournamentId?: string) => {
  const authFetch = useAuthorizedFetch();

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [match, setMatch] = useState<MatchRecord | null>(null);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      const query = tournamentId ? `?tournament_id=${encodeURIComponent(tournamentId)}` : '';
      const response = await authFetch(`/api/teams${query}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      setError(err.message);
    }
  }, [authFetch, tournamentId]);

  // Load match data
  const loadMatch = useCallback(async () => {
    if (!matchId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/matches/${matchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch match');
      }
      const data = await response.json();
      setMatch(data);
    } catch (err: any) {
      console.error('Failed to load match:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, matchId]);

  // Save match
  const saveMatch = useCallback(async (matchData: Partial<MatchRecord>) => {
    if (!matchId) return false;

    setSaving(true);
    setError(null);
    try {
      const response = await authFetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save match');
      }

      return true;
    } catch (err: any) {
      console.error('Failed to save match:', err);
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [authFetch, matchId]);

  // Delete match
  const deleteMatch = useCallback(async () => {
    if (!matchId) return false;

    try {
      const response = await authFetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete match');
      }

      return true;
    } catch (err: any) {
      console.error('Failed to delete match:', err);
      setError(err.message);
      return false;
    }
  }, [authFetch, matchId]);

  return {
    // State
    loading,
    saving,
    error,
    setError,
    teams,
    match,
    setMatch,
    // Actions
    fetchTeams,
    loadMatch,
    saveMatch,
    deleteMatch,
  };
};
