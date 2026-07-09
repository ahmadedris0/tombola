import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  // The admin app authenticates against the dedicated admin user pool, so any
  // authenticated user here is an administrator.
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
