import { renderHook } from '@testing-library/react';
import { useAuthorizedFetch } from './useAuthorizedFetch';
import { useAuth } from './AuthContext';

// Mock useAuth
jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useAuthorizedFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('adds Authorization header when token is available', () => {
    const mockToken = 'test-token-123';
    mockUseAuth.mockReturnValue({
      getAccessToken: () => mockToken,
      session: null,
      user: null,
      loading: false,
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    });

    const { result } = renderHook(() => useAuthorizedFetch());
    const authorizedFetch = result.current;

    authorizedFetch('/api/test');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
  });

  it('does not add Authorization header when token is null', () => {
    mockUseAuth.mockReturnValue({
      getAccessToken: () => null,
      session: null,
      user: null,
      loading: false,
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    });

    const { result } = renderHook(() => useAuthorizedFetch());
    const authorizedFetch = result.current;

    authorizedFetch('/api/test');

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('preserves existing headers', () => {
    mockUseAuth.mockReturnValue({
      getAccessToken: () => 'test-token',
      session: null,
      user: null,
      loading: false,
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    });

    const { result } = renderHook(() => useAuthorizedFetch());
    const authorizedFetch = result.current;

    authorizedFetch('/api/test', {
      headers: { 'Content-Type': 'application/json' },
    });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });
});
