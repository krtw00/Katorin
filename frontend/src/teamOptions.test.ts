import { teamOptions } from './teamOptions';

describe('teamOptions', () => {
  it('exports an array of team names', () => {
    expect(Array.isArray(teamOptions)).toBe(true);
    expect(teamOptions.length).toBeGreaterThan(0);
  });

  it('contains only string values', () => {
    teamOptions.forEach(team => {
      expect(typeof team).toBe('string');
    });
  });

  it('has expected team names', () => {
    expect(teamOptions).toContain('Raid Reign');
    expect(teamOptions).toContain('B&E');
  });

  it('has no empty strings', () => {
    teamOptions.forEach(team => {
      expect(team.length).toBeGreaterThan(0);
    });
  });
});
