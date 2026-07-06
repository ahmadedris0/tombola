import { useTranslation } from 'react-i18next';
import { setLocale } from '../i18n/index';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  const label = next === 'ar' ? t('lang.switchToArabic') : t('lang.switchToEnglish');
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="min-h-touch min-w-touch rounded border px-3 py-2"
    >
      {label}
    </button>
  );
}
