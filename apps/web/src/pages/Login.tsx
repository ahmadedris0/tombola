import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { normalizeToE164, mapCognitoError } from '@tombola/auth';
import { useAuth } from '../auth/AuthProvider';
import { PhoneInput } from '../components/PhoneInput';

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
      await refresh();
      navigate('/profile');
    } catch (err) {
      setError(t(mapCognitoError((err as { name?: string }).name)));
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-bold">{t('auth.login')}</h1>
      <PhoneInput value={phone} onChange={setPhone} />
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
      <div className="flex justify-between text-sm">
        <Link to="/register">{t('auth.needAccount')}</Link>
        <Link to="/forgot">{t('auth.forgotPassword')}</Link>
      </div>
    </form>
  );
}
