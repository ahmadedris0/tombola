import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { AuthClient, type AuthUser } from '@tombola/auth';
import { authConfig } from './config';

interface AuthState {
  client: AuthClient;
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const client = new AuthClient(authConfig);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [u, s] = await Promise.all([client.currentUser(), client.currentSession()]);
    setUser(u);
    setToken(s?.accessToken ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    client.signOut();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ client, user, loading, token, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
