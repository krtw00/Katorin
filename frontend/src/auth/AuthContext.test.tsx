import React from 'react';
import { render } from '@testing-library/react';
import { useAuth } from './AuthContext';

// Mock Supabase client
jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

describe('AuthContext', () => {
  describe('useAuth', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        useAuth();
        return null;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth は AuthProvider 内でのみ使用できます。');

      consoleSpy.mockRestore();
    });
  });
});
