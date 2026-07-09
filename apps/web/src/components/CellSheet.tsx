import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { NumberCell } from '@tombola/shared';
import { useAuth } from '../auth/AuthProvider';
import { reserveNumbers, cancelReservation, type PaymentInstructions } from '../api/reservations';

function useCountdown(iso?: string): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return secs;
}

export function CellSheet({
  cell,
  tombolaId,
  onClose,
  onChanged,
}: {
  cell: NumberCell | null;
  tombolaId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const secs = useCountdown(instructions?.reservationExpiresAt);

  useEffect(() => {
    setInstructions(null);
    setError(null);
  }, [cell?.number]);

  if (!cell) return null;
  const label = i18n.language === 'ar' ? cell.labelAr : cell.labelEn;
  const ownedByMe = cell.state === 'reserved' && !!user && cell.ownerUserId === user.sub;
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  async function doReserve() {
    if (!token) {
      navigate('/login');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setInstructions(await reserveNumbers(token, tombolaId, [cell!.number]));
      onChanged();
    } catch (e) {
      const m = (e as Error).message;
      setError(
        m === 'conflict'
          ? t('tombola.conflict')
          : m === 'cap_exceeded'
            ? t('tombola.capExceeded')
            : t('tombola.reserveError'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    if (!token) return;
    setBusy(true);
    try {
      await cancelReservation(token, tombolaId, [cell!.number]);
      onChanged();
      onClose();
    } catch {
      setError(t('tombola.reserveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('tombola.numberDetail')}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
        {instructions ? (
          <>
            <h2 className="text-xl font-bold">{t('tombola.paymentInstructions')}</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('tombola.numbersLabel')}</dt>
                <dd>{instructions.numbers.join(', ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('tombola.amountDue')}</dt>
                <dd>
                  {instructions.amount} {instructions.currency}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('tombola.whishNumber')}</dt>
                <dd dir="ltr">{instructions.whishNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('tombola.expiresIn')}</dt>
                <dd>
                  {mm}:{ss}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gray-500">{t('tombola.payHint')}</p>
            <button
              type="button"
              onClick={doCancel}
              disabled={busy}
              className="min-h-touch mt-4 w-full rounded border border-red-300 px-3 py-2 text-red-700"
            >
              {t('tombola.cancelReservation')}
            </button>
            <button type="button" onClick={onClose} className="min-h-touch mt-2 w-full rounded border px-3 py-2">
              {t('tombola.close')}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold">
              #{cell.number} · {label}
            </h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('tombola.status')}</dt>
                <dd>{t(`tombola.state.${cell.state}`)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('tombola.holder')}</dt>
                <dd>{cell.ownerName ?? '—'}</dd>
              </div>
            </dl>
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}
            {cell.state === 'available' && (
              <button
                type="button"
                onClick={doReserve}
                disabled={busy}
                className="min-h-touch mt-4 w-full rounded bg-black px-3 py-2 text-white"
              >
                {user ? t('tombola.reserve') : t('tombola.loginToReserve')}
              </button>
            )}
            {ownedByMe && (
              <button
                type="button"
                onClick={doCancel}
                disabled={busy}
                className="min-h-touch mt-4 w-full rounded border border-red-300 px-3 py-2 text-red-700"
              >
                {t('tombola.cancelReservation')}
              </button>
            )}
            <button type="button" onClick={onClose} className="min-h-touch mt-2 w-full rounded border px-3 py-2">
              {t('tombola.close')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
