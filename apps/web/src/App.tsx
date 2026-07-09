import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Register } from './pages/Register';
import { VerifyOtp } from './pages/VerifyOtp';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { Profile } from './pages/Profile';
import { Tombolas } from './pages/Tombolas';
import { TombolaDetail } from './pages/TombolaDetail';
import { Notifications } from './pages/Notifications';
import { NotificationsBell } from './components/NotificationsBell';
import { RequireAuth } from './auth/RequireAuth';
import { useAuth } from './auth/AuthProvider';

function HeaderActions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="flex items-center gap-3">
      <NotificationsBell />
      <Link to={user ? '/profile' : '/login'} className="text-sm underline">
        {user ? t('auth.profile') : t('auth.login')}
      </Link>
      <LanguageSwitcher />
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <Link to="/" className="text-lg font-bold">
          {t('app.title')}
        </Link>
        <HeaderActions />
      </header>
      <Routes>
        <Route path="/" element={<Tombolas />} />
        <Route path="/tombolas/:id" element={<TombolaDetail />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <Notifications />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
