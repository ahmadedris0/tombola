import { useTranslation } from 'react-i18next';
import type { NumberCell } from '@tombola/shared';

/** Bottom sheet showing a number's detail; the reserve action is a disabled placeholder (M3). */
export function CellSheet({ cell, onClose }: { cell: NumberCell | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  if (!cell) return null;
  const label = i18n.language === 'ar' ? cell.labelAr : cell.labelEn;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('tombola.numberDetail')}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
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
            <dd>{cell.ownerUserId ? t('tombola.taken') : '—'}</dd>
          </div>
        </dl>
        <button
          type="button"
          disabled
          className="min-h-touch mt-4 w-full rounded bg-gray-200 px-3 py-2 text-gray-500"
        >
          {t('tombola.reserveComingSoon')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-touch mt-2 w-full rounded border px-3 py-2"
        >
          {t('tombola.close')}
        </button>
      </div>
    </div>
  );
}
