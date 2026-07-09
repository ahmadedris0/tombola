import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { fetchNotifications, unreadCount } from '../api/notifications';

export function NotificationsBell() {
  const { token } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetchNotifications(token)
      .then((r) => setCount(unreadCount(r.notifications, r.lastReadAt)))
      .catch(() => setCount(0));
  }, [token, location.pathname]);

  if (!token) return null;

  return (
    <Link to="/notifications" className="relative inline-flex min-h-touch min-w-touch items-center justify-center" aria-label="notifications">
      <span className="text-xl">🔔</span>
      {count > 0 && (
        <span className="absolute -end-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
