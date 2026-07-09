import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { apiFetch } from '../api/client';
import { setLocale } from '../i18n/index';

export function Profile() {
  const { t } = useTranslation();
  const { user, token, refresh, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [locale, setLocaleState] = useState<'en' | 'ar'>(user?.locale ?? 'en');
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (!token) return;
    const res = await apiFetch('/me', token, {
      method: 'PUT',
      body: JSON.stringify({ fullName, locale }),
    });
    if (res.ok) {
      setLocale(locale);
      await refresh();
      setSaved(true);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-bold">{t('auth.profile')}</h1>
      <label className="block">
        <span className="mb-1 block text-sm">{t('auth.fullName')}</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="min-h-touch w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm">{t('auth.language')}</span>
        <select
          value={locale}
          onChange={(e) => setLocaleState(e.target.value as 'en' | 'ar')}
          className="min-h-touch w-full rounded border px-3 py-2"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </label>
      {saved && <p className="text-sm text-green-600">{t('auth.saved')}</p>}
      <button type="submit" className="min-h-touch w-full rounded bg-black px-3 py-2 text-white">
        {t('auth.save')}
      </button>
      <button type="button" onClick={signOut} className="min-h-touch w-full rounded border px-3 py-2">
        {t('auth.logout')}
      </button>
    </form>
  );
}
