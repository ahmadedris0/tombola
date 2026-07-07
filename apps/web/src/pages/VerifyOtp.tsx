import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mapCognitoError } from '@tombola/auth';
import { useAuth } from '../auth/AuthProvider';

const RESEND_COOLDOWN = 60;

export function VerifyOtp() {
  const { t } = useTranslation();
  const { client } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get('phone') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await client.confirm(phone, code);
      navigate('/login');
    } catch (err) {
      setError(t(mapCognitoError((err as { name?: string }).name)));
    }
  }

  async function resend() {
    setError(null);
    try {
      await client.resend(phone);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(t(mapCognitoError((err as { name?: string }).name)));
    }
  }

  return (
    <form onSubmit={verify} className="mx-auto max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-bold">{t('auth.verify')}</h1>
      <label className="block">
        <span className="mb-1 block text-sm">{t('auth.code')}</span>
        <input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="min-h-touch w-full rounded border px-3 py-2"
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="min-h-touch w-full rounded bg-black px-3 py-2 text-white">
        {t('auth.verify')}
      </button>
      <button
        type="button"
        onClick={resend}
        disabled={cooldown > 0}
        className="min-h-touch w-full rounded border px-3 py-2 disabled:opacity-50"
      >
        {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
      </button>
    </form>
  );
}
