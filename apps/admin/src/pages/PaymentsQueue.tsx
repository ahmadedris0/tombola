import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import {
  listPendingPayments,
  confirmPayment,
  rejectPayment,
  type AdminPayment,
} from '../api/payments';

export function PaymentsQueue() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<AdminPayment[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    listPendingPayments(token)
      .then(setItems)
      .catch(() => setError(true));
  }, [token]);

  useEffect(() => load(), [load]);

  async function act(id: string, kind: 'confirm' | 'reject') {
    if (!token) return;
    setBusy(id);
    try {
      await (kind === 'confirm' ? confirmPayment(token, id) : rejectPayment(token, id));
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-bold">{t('payments.queue')}</h1>
      {error && <p className="text-red-600">{t('payments.loadError')}</p>}
      <ul className="divide-y rounded border">
        {items.map((p) => (
          <li key={p.paymentId} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-semibold">
                  {p.amount} {p.currency} · {t('payments.numbers')}: {p.numbers.join(', ')}
                </p>
                <p className="text-gray-500">
                  {t('payments.reference')}: {p.whishReference || '—'}
                </p>
                <p className="text-gray-400">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy === p.paymentId}
                  onClick={() => act(p.paymentId, 'confirm')}
                  className="min-h-touch rounded bg-green-700 px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                  {t('payments.confirm')}
                </button>
                <button
                  type="button"
                  disabled={busy === p.paymentId}
                  onClick={() => act(p.paymentId, 'reject')}
                  className="min-h-touch rounded border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-50"
                >
                  {t('payments.reject')}
                </button>
              </div>
            </div>
          </li>
        ))}
        {!items.length && !error && <li className="p-3 text-gray-500">{t('payments.empty')}</li>}
      </ul>
    </div>
  );
}
