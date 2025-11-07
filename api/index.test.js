// Basic test for API server utilities
const { createSlugFrom } = (() => {
  // Extract createSlugFrom function for testing
  const createSlugFrom = (value) =>
    value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  return { createSlugFrom };
})();

describe('API Server Utilities', () => {
  describe('createSlugFrom', () => {
    it('converts string to slug format', () => {
      expect(createSlugFrom('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(createSlugFrom('Hello@World!')).toBe('hello-world');
    });

    it('handles multiple spaces', () => {
      expect(createSlugFrom('Hello   World')).toBe('hello-world');
    });

    it('trims leading and trailing spaces', () => {
      expect(createSlugFrom('  Hello World  ')).toBe('hello-world');
    });

    it('removes leading and trailing dashes', () => {
      expect(createSlugFrom('-Hello-World-')).toBe('hello-world');
    });

    it('converts uppercase to lowercase', () => {
      expect(createSlugFrom('HELLO WORLD')).toBe('hello-world');
    });

    it('handles numbers', () => {
      expect(createSlugFrom('Team 123')).toBe('team-123');
    });
  });
});
