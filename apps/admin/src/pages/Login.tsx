import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { mapCognitoError } from '@tombola/auth';
import { useAuth } from '../auth/AuthProvider';

export function Login() {
  const { t } = useTranslation();
  const { client, refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // Dedicated admin pool: any successful sign-in is an administrator.
      await client.signIn(email.trim().toLowerCase(), password);
      await refresh();
      navigate('/');
    } catch (err) {
      setError(t(mapCognitoError((err as { name?: string }).name)));
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-bold">{t('auth.login')}</h1>
      <label className="block">
        <span className="mb-1 block text-sm">{t('auth.email')}</span>
        <input
          type="email"
          dir="ltr"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="min-h-touch w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm">{t('auth.password')}</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-touch w-full rounded border px-3 py-2"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" className="min-h-touch w-full rounded bg-black px-3 py-2 text-white">
        {t('auth.login')}
      </button>
    </form>
  );
}
