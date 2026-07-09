import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Login } from './pages/Login';
import { TombolaList } from './pages/TombolaList';
import { TombolaForm } from './pages/TombolaForm';
import { PaymentsQueue } from './pages/PaymentsQueue';
import { RequireAdmin } from './auth/RequireAdmin';
import { useAuth } from './auth/AuthProvider';

function HeaderActions() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  if (!user) return <LanguageSwitcher />;
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link to="/" className="underline">
        {t('admin.tombolas')}
      </Link>
      <Link to="/payments" className="underline">
        {t('payments.queue')}
      </Link>
      <button onClick={signOut} className="underline">
        {t('auth.logout')}
      </button>
      <LanguageSwitcher />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <span className="text-lg font-bold">Tombola Admin</span>
        <HeaderActions />
      </header>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAdmin>
              <TombolaList />
            </RequireAdmin>
          }
        />
        <Route
          path="/new"
          element={
            <RequireAdmin>
              <TombolaForm />
            </RequireAdmin>
          }
        />
        <Route
          path="/:id/edit"
          element={
            <RequireAdmin>
              <TombolaForm />
            </RequireAdmin>
          }
        />
        <Route
          path="/payments"
          element={
            <RequireAdmin>
              <PaymentsQueue />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
