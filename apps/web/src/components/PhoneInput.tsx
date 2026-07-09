import { useTranslation } from 'react-i18next';

export function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <label className="block">
      <span className="mb-1 block text-sm">{t('auth.phone')}</span>
      <input
        type="tel"
        inputMode="tel"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-touch w-full rounded border px-3 py-2"
        placeholder="70 123 456"
      />
    </label>
  );
}
