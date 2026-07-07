import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { normalizeToE164, mapCognitoError } from '@tombola/auth';
import { useAuth } from '../auth/AuthProvider';
import { PhoneInput } from '../components/PhoneInput';

export function ForgotPassword() {
  const { t } = useTranslation();
  const { client } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await client.forgotPassword(normalizeToE164(phone));
      setSent(true);
    } catch (err) {
      setError(t(mapCognitoError((err as { name?: string }).name)));
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await client.confirmForgotPassword(normalizeToE164(phone), code, password);
      navigate('/login');
    } catch (err) {
      setError(t(mapCognitoError((err as { name?: string }).name)));
    }
  }

  return (
    <form onSubmit={sent ? confirm : request} className="mx-auto max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-bold">{t('auth.reset')}</h1>
      {!sent && <PhoneInput value={phone} onChange={setPhone} />}
      {sent && (
        <>
          <label className="block">
            <span className="mb-1 block text-sm">{t('auth.code')}</span>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-touch w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t('auth.newPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-touch w-full rounded border px-3 py-2"
            />
          </label>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="min-h-touch w-full rounded bg-black px-3 py-2 text-white">
        {sent ? t('auth.reset') : t('auth.resend')}
      </button>
    </form>
  );
}
