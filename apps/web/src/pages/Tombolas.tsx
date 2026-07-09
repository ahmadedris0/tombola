import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchTombolas, type GroupedTombolas } from '../api/tombolas';

const ORDER = ['active', 'upcoming', 'finished'];

export function Tombolas() {
  const { t, i18n } = useTranslation();
  const [groups, setGroups] = useState<GroupedTombolas | null>(null);
  const [error, setError] = useState(false);
  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    fetchTombolas()
      .then(setGroups)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="p-4">{t('tombola.loadError')}</p>;
  if (!groups) return <p className="p-4">{t('tombola.loading')}</p>;

  const empty = ORDER.every((s) => !(groups[s]?.length));

  return (
    <div className="mx-auto max-w-2xl p-4">
      {empty && <p className="text-gray-500">{t('tombola.none')}</p>}
      {ORDER.map((status) => {
        const items = groups[status] ?? [];
        if (!items.length) return null;
        return (
          <section key={status} className="mb-6">
            <h2 className="mb-2 text-lg font-bold">{t(`tombola.status.${status}`)}</h2>
            <ul className="space-y-3">
              {items.map((tb) => (
                <li key={tb.tombolaId}>
                  <Link to={`/tombolas/${tb.tombolaId}`} className="block rounded border p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{tb.title[locale]}</h3>
                      <span className="text-sm text-gray-500">{t(`tombola.state.${tb.status}`)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {t('tombola.prize')}: {tb.prizeAmount} {tb.currency} · {t('tombola.price')}:{' '}
                      {tb.pricePerNumber} {tb.currency}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('tombola.grid')}: {tb.gridSize}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
