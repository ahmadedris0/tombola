import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Login } from './pages/Login';
import { RequireAdmin } from './auth/RequireAdmin';
import { useAuth } from './auth/AuthProvider';

function Dashboard() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">{t('app.title')}</h1>
      <button onClick={signOut} className="min-h-touch mt-4 rounded border px-3 py-2">
        {t('auth.logout')}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <span className="text-lg font-bold">Tombola Admin</span>
        <LanguageSwitcher />
      </header>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
