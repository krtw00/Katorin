import { duelDefault, type DuelForm } from './duelDefaults';

describe('duelDefaults', () => {
  it('exports a valid DuelForm object', () => {
    expect(duelDefault).toBeDefined();
    expect(typeof duelDefault.title).toBe('string');
    expect(typeof duelDefault.subtitle).toBe('string');
    expect(typeof duelDefault.stage).toBe('string');
    expect(typeof duelDefault.date).toBe('string');
    expect(typeof duelDefault.leftTeamName).toBe('string');
    expect(typeof duelDefault.rightTeamName).toBe('string');
    expect(typeof duelDefault.leftRosterText).toBe('string');
    expect(typeof duelDefault.rightRosterText).toBe('string');
    expect(typeof duelDefault.matchesText).toBe('string');
    expect(typeof duelDefault.scoreLabel).toBe('string');
    expect(typeof duelDefault.winLabel).toBe('string');
    expect(typeof duelDefault.loseLabel).toBe('string');
  });

  it('has non-empty required fields', () => {
    expect(duelDefault.title).toBe('DUEL');
    expect(duelDefault.leftTeamName.length).toBeGreaterThan(0);
    expect(duelDefault.rightTeamName.length).toBeGreaterThan(0);
  });

  it('has valid date format', () => {
    expect(duelDefault.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
