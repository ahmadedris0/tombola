import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider';

const { currentUser, currentSession } = vi.hoisted(() => ({
  currentUser: vi.fn(),
  currentSession: vi.fn(),
}));
vi.mock('@tombola/auth', async (orig) => {
  const actual = await orig<typeof import('@tombola/auth')>();
  return {
    ...actual,
    AuthClient: class {
      currentUser = currentUser;
      currentSession = currentSession;
      signOut = vi.fn();
    },
  };
});

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? user.fullName : 'anon'}</div>;
}

beforeEach(() => {
  currentUser.mockReset();
  currentSession.mockReset();
});

describe('AuthProvider', () => {
  it('exposes the current user after loading', async () => {
    currentUser.mockResolvedValue({ sub: 'u1', fullName: 'Ahmad E', locale: 'en', phoneE164: '+961', groups: [] });
    currentSession.mockResolvedValue({ idToken: 'i', accessToken: 'a', refreshToken: 'r' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('Ahmad E')).toBeInTheDocument());
  });

  it('shows anon when there is no session', async () => {
    currentUser.mockResolvedValue(null);
    currentSession.mockResolvedValue(null);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument());
  });
});
