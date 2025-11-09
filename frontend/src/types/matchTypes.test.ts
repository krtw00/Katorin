import {
  createInitialValues,
  formatDate,
  toTimestamp,
  parseScoreValue,
  determineStatus,
  getInitial,
  type MatchFormValues,
} from './matchTypes';
// DisplayMatch型はテストに直接使用していないため、不要

describe('matchTypes utilities', () => {
  describe('createInitialValues', () => {
    it('creates initial form values with empty strings', () => {
      const result: MatchFormValues = createInitialValues();
      expect(result).toEqual({
        team: '',
        opponentTeam: '',
        date: '',
      });
    });
  });

  describe('formatDate', () => {
    it('formats valid date string to Japanese format', () => {
      const result = formatDate('2025-03-16');
      expect(result).toBe('2025/03/16');
    });

    it('returns "日付未設定" for null', () => {
      const result = formatDate(null);
      expect(result).toBe('日付未設定');
    });

    it('returns "日付未設定" for undefined', () => {
      const result = formatDate(undefined);
      expect(result).toBe('日付未設定');
    });

    it('returns original value for invalid date string', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('invalid-date');
    });
  });

  describe('toTimestamp', () => {
    it('converts valid date string to timestamp', () => {
      const result = toTimestamp('2025-03-16');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('returns NEGATIVE_INFINITY for null', () => {
      const result = toTimestamp(null);
      expect(result).toBe(Number.NEGATIVE_INFINITY);
    });

    it('returns NEGATIVE_INFINITY for undefined', () => {
      const result = toTimestamp(undefined);
      expect(result).toBe(Number.NEGATIVE_INFINITY);
    });

    it('returns NEGATIVE_INFINITY for invalid date', () => {
      const result = toTimestamp('invalid-date');
      expect(result).toBe(Number.NEGATIVE_INFINITY);
    });
  });

  describe('parseScoreValue', () => {
    it('parses valid number string', () => {
      expect(parseScoreValue('5')).toBe(5);
      expect(parseScoreValue('0')).toBe(0);
      expect(parseScoreValue('123')).toBe(123);
    });

    it('parses number with whitespace', () => {
      expect(parseScoreValue('  5  ')).toBe(5);
    });

    it('returns null for null', () => {
      expect(parseScoreValue(null)).toBe(null);
    });

    it('returns null for undefined', () => {
      expect(parseScoreValue(undefined)).toBe(null);
    });

    it('returns null for empty string', () => {
      expect(parseScoreValue('')).toBe(null);
      expect(parseScoreValue('   ')).toBe(null);
    });

    it('returns null for non-numeric string', () => {
      expect(parseScoreValue('abc')).toBe(null);
      expect(parseScoreValue('1a2')).toBe(null);
    });

    it('returns null for Infinity', () => {
      expect(parseScoreValue('Infinity')).toBe(null);
    });
  });

  describe('determineStatus', () => {
    it('returns "homeWin" when home score is higher', () => {
      expect(determineStatus(5, 3)).toBe('homeWin');
      expect(determineStatus(1, 0)).toBe('homeWin');
    });

    it('returns "awayWin" when away score is higher', () => {
      expect(determineStatus(3, 5)).toBe('awayWin');
      expect(determineStatus(0, 1)).toBe('awayWin');
    });

    it('returns "draw" when scores are equal', () => {
      expect(determineStatus(3, 3)).toBe('draw');
      expect(determineStatus(0, 0)).toBe('draw');
    });

    it('returns "pending" when home score is null', () => {
      expect(determineStatus(null, 5)).toBe('pending');
    });

    it('returns "pending" when away score is null', () => {
      expect(determineStatus(5, null)).toBe('pending');
    });

    it('returns "pending" when both scores are null', () => {
      expect(determineStatus(null, null)).toBe('pending');
    });
  });

  describe('getInitial', () => {
    it('returns first character of non-empty string', () => {
      expect(getInitial('Raid Reign')).toBe('R');
      expect(getInitial('Team A')).toBe('T');
      expect(getInitial('X')).toBe('X');
    });

    it('returns "？" for null', () => {
      expect(getInitial(null)).toBe('？');
    });

    it('returns "？" for undefined', () => {
      expect(getInitial(undefined)).toBe('？');
    });

    it('returns "？" for empty string', () => {
      expect(getInitial('')).toBe('？');
    });

    it('returns "？" for whitespace-only string', () => {
      expect(getInitial('   ')).toBe('？');
    });

    it('trims whitespace before getting initial', () => {
      expect(getInitial('  Team  ')).toBe('T');
    });
  });
});
