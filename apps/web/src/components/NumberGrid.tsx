import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NumberCell } from '@tombola/shared';

const STATE_CLASS: Record<string, string> = {
  available: 'bg-green-100 text-green-900 border-green-300',
  reserved: 'bg-amber-100 text-amber-900 border-amber-300',
  confirmed: 'bg-red-100 text-red-900 border-red-300',
};

export function NumberGrid({
  cells,
  onSelect,
}: {
  cells: NumberCell[];
  onSelect: (cell: NumberCell) => void;
}) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setView('grid')}
          className={`min-h-touch rounded border px-3 py-1 ${view === 'grid' ? 'bg-black text-white' : ''}`}
        >
          {t('tombola.gridView')}
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={`min-h-touch rounded border px-3 py-1 ${view === 'list' ? 'bg-black text-white' : ''}`}
        >
          {t('tombola.listView')}
        </button>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
          {cells.map((cell) => (
            <button
              key={cell.number}
              type="button"
              onClick={() => onSelect(cell)}
              className={`flex aspect-square min-h-touch items-center justify-center rounded border text-sm font-semibold ${
                STATE_CLASS[cell.state] ?? ''
              }`}
              aria-label={`${cell.number}`}
            >
              {cell.number}
            </button>
          ))}
        </div>
      ) : (
        <ul className="divide-y rounded border">
          {cells.map((cell) => (
            <li key={cell.number}>
              <button
                type="button"
                onClick={() => onSelect(cell)}
                className="flex min-h-touch w-full items-center justify-between px-3 py-2 text-start"
              >
                <span className="font-semibold">
                  {cell.number} · {locale === 'ar' ? cell.labelAr : cell.labelEn}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs ${STATE_CLASS[cell.state] ?? ''}`}>
                  {t(`tombola.state.${cell.state}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
