import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { normalizeToE164, mapCognitoError } from '@tombola/auth';
import { useAuth } from '../auth/AuthProvider';

export function Login() {
  const { t } = useTranslation();
  const { client, refresh } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await client.signIn(normalizeToE164(phone), password);
      const user = await client.currentUser();
      if (!user?.groups.includes('admin')) {
        client.signOut();
        setError(t('auth.notAdmin'));
        return;
      }
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
        <span className="mb-1 block text-sm">{t('auth.phone')}</span>
        <input
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="70 123 456"
          className="min-h-touch w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm">{t('auth.password')}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-touch w-full rounded border px-3 py-2"
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="min-h-touch w-full rounded bg-black px-3 py-2 text-white">
        {t('auth.login')}
      </button>
    </form>
  );
}
