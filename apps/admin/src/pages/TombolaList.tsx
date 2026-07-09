import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Tombola } from '@tombola/shared';
import { useAuth } from '../auth/AuthProvider';
import { listAdminTombolas, duplicateTombola, deleteTombola, drawTombola } from '../api/tombolas';

export function TombolaList() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<Tombola[]>([]);
  const [error, setError] = useState(false);
  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  const load = useCallback(() => {
    if (!token) return;
    listAdminTombolas(token)
      .then(setItems)
      .catch(() => setError(true));
  }, [token]);

  useEffect(() => load(), [load]);

  async function onDuplicate(id: string) {
    if (!token) return;
    await duplicateTombola(token, id);
    load();
  }
  async function onDelete(id: string) {
    if (!token || !confirm(t('admin.confirmDelete'))) return;
    await deleteTombola(token, id);
    load();
  }
  async function onDraw(id: string) {
    if (!token || !confirm(t('admin.confirmDraw'))) return;
    try {
      await drawTombola(token, id);
    } catch (e) {
      alert(t('admin.drawError', { reason: (e as Error).message }));
    }
    load();
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('admin.tombolas')}</h1>
        <Link to="/new" className="min-h-touch rounded bg-black px-3 py-2 text-white">
          {t('admin.newTombola')}
        </Link>
      </div>
      {error && <p className="text-red-600">{t('admin.loadError')}</p>}
      <ul className="divide-y rounded border">
        {items.map((tb) => (
          <li key={tb.tombolaId} className="flex items-center justify-between gap-2 p-3">
            <div>
              <p className="font-semibold">{tb.title[locale]}</p>
              <p className="text-sm text-gray-500">
                {t(`admin.state.${tb.status}`)} · {tb.gridSize} · {tb.prizeAmount} {tb.currency}
              </p>
              {tb.status === 'finished' && tb.winningNumber != null && (
                <p className="text-sm font-semibold text-green-700">
                  {t('admin.winner')}: #{tb.winningNumber} — {tb.winnerName ?? '—'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 text-sm">
              {(tb.status === 'active' || tb.status === 'closed') && (
                <button
                  type="button"
                  onClick={() => onDraw(tb.tombolaId)}
                  className="min-h-touch rounded bg-green-700 px-2 py-1 text-white"
                >
                  {t('admin.runDraw')}
                </button>
              )}
              <Link to={`/${tb.tombolaId}/edit`} className="min-h-touch rounded border px-2 py-1">
                {t('admin.edit')}
              </Link>
              <button
                type="button"
                onClick={() => onDuplicate(tb.tombolaId)}
                className="min-h-touch rounded border px-2 py-1"
              >
                {t('admin.duplicate')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(tb.tombolaId)}
                className="min-h-touch rounded border border-red-300 px-2 py-1 text-red-700"
              >
                {t('admin.delete')}
              </button>
            </div>
          </li>
        ))}
        {!items.length && !error && <li className="p-3 text-gray-500">{t('admin.noTombolas')}</li>}
      </ul>
    </div>
  );
}
