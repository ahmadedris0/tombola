import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';

export default function App() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('app.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="mt-2 text-gray-600">{t('app.tagline')}</p>
    </main>
  );
}
