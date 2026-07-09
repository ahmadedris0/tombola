import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Tombola, NumberCell } from '@tombola/shared';
import { fetchTombola, fetchNumbers } from '../api/tombolas';
import { NumberGrid } from '../components/NumberGrid';
import { CellSheet } from '../components/CellSheet';

export function TombolaDetail() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const [tombola, setTombola] = useState<Tombola | null>(null);
  const [cells, setCells] = useState<NumberCell[]>([]);
  const [selected, setSelected] = useState<NumberCell | null>(null);
  const [error, setError] = useState(false);
  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    Promise.all([fetchTombola(id), fetchNumbers(id)])
      .then(([tb, ns]) => {
        setTombola(tb);
        setCells(ns);
      })
      .catch(() => setError(true));
  }, [id]);

  if (error) return <p className="p-4">{t('tombola.loadError')}</p>;
  if (!tombola) return <p className="p-4">{t('tombola.loading')}</p>;

  const taken = cells.filter((c) => c.state !== 'available').length;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold">{tombola.title[locale]}</h1>
      <p className="mb-4 text-sm text-gray-600">
        {t('tombola.prize')}: {tombola.prizeAmount} {tombola.currency} · {taken}/{tombola.gridSize}
      </p>
      <NumberGrid cells={cells} onSelect={setSelected} />
      <CellSheet cell={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
