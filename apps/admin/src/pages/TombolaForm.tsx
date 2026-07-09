import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { listAdminTombolas, createTombola, updateTombola } from '../api/tombolas';

interface FormState {
  titleEn: string;
  titleAr: string;
  pricePerNumber: string;
  prizeAmount: string;
  currency: string;
  gridSize: string;
  reservationWindowMinutes: string;
  drawPoolMode: 'confirmed_only' | 'full_grid';
  status: string;
  openAt: string;
  drawAt: string;
}

const EMPTY: FormState = {
  titleEn: '',
  titleAr: '',
  pricePerNumber: '10',
  prizeAmount: '400',
  currency: 'USD',
  gridSize: '100',
  reservationWindowMinutes: '60',
  drawPoolMode: 'confirmed_only',
  status: 'draft',
  openAt: '',
  drawAt: '',
};

const STATUSES = ['draft', 'upcoming', 'active', 'closed', 'finished', 'cancelled'];

function toIso(local: string): string | undefined {
  return local ? new Date(local).toISOString() : undefined;
}

export function TombolaForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const editing = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || !token) return;
    listAdminTombolas(token).then((list) => {
      const tb = list.find((x) => x.tombolaId === id);
      if (!tb) return;
      setForm({
        titleEn: tb.title.en,
        titleAr: tb.title.ar,
        pricePerNumber: String(tb.pricePerNumber),
        prizeAmount: String(tb.prizeAmount),
        currency: tb.currency,
        gridSize: String(tb.gridSize),
        reservationWindowMinutes: String(tb.reservationWindowMinutes),
        drawPoolMode: tb.drawPoolMode,
        status: tb.status,
        openAt: tb.openAt ? tb.openAt.slice(0, 16) : '',
        drawAt: tb.drawAt ? tb.drawAt.slice(0, 16) : '',
      });
    });
  }, [editing, id, token]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return;
    const base = {
      title: { en: form.titleEn, ar: form.titleAr },
      pricePerNumber: Number(form.pricePerNumber),
      prizeAmount: Number(form.prizeAmount),
      currency: form.currency,
      reservationWindowMinutes: Number(form.reservationWindowMinutes),
      drawPoolMode: form.drawPoolMode,
      status: form.status,
      openAt: toIso(form.openAt),
      drawAt: toIso(form.drawAt),
    };
    try {
      if (editing && id) {
        await updateTombola(token, id, base);
      } else {
        await createTombola(token, { ...base, gridSize: Number(form.gridSize) });
      }
      navigate('/');
    } catch {
      setError(t('admin.saveError'));
    }
  }

  const field = 'min-h-touch w-full rounded border px-3 py-2';

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-3 p-4">
      <h1 className="text-xl font-bold">{editing ? t('admin.editTombola') : t('admin.newTombola')}</h1>
      <label className="block">
        <span className="text-sm">{t('admin.titleEn')}</span>
        <input className={field} value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm">{t('admin.titleAr')}</span>
        <input className={field} dir="rtl" value={form.titleAr} onChange={(e) => set('titleAr', e.target.value)} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm">{t('admin.price')}</span>
          <input className={field} type="number" value={form.pricePerNumber} onChange={(e) => set('pricePerNumber', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">{t('admin.prize')}</span>
          <input className={field} type="number" value={form.prizeAmount} onChange={(e) => set('prizeAmount', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">{t('admin.currency')}</span>
          <input className={field} value={form.currency} onChange={(e) => set('currency', e.target.value)} />
        </label>
        {!editing && (
          <label className="block">
            <span className="text-sm">{t('admin.gridSize')}</span>
            <input className={field} type="number" value={form.gridSize} onChange={(e) => set('gridSize', e.target.value)} />
          </label>
        )}
        <label className="block">
          <span className="text-sm">{t('admin.window')}</span>
          <input className={field} type="number" value={form.reservationWindowMinutes} onChange={(e) => set('reservationWindowMinutes', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">{t('admin.drawPool')}</span>
          <select className={field} value={form.drawPoolMode} onChange={(e) => set('drawPoolMode', e.target.value as FormState['drawPoolMode'])}>
            <option value="confirmed_only">{t('admin.confirmedOnly')}</option>
            <option value="full_grid">{t('admin.fullGrid')}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm">{t('admin.status')}</span>
          <select className={field} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.state.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">{t('admin.openAt')}</span>
          <input className={field} type="datetime-local" value={form.openAt} onChange={(e) => set('openAt', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">{t('admin.drawAt')}</span>
          <input className={field} type="datetime-local" value={form.drawAt} onChange={(e) => set('drawAt', e.target.value)} />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="min-h-touch flex-1 rounded bg-black px-3 py-2 text-white">
          {t('admin.save')}
        </button>
        <button type="button" onClick={() => navigate('/')} className="min-h-touch rounded border px-3 py-2">
          {t('admin.cancel')}
        </button>
      </div>
    </form>
  );
}
