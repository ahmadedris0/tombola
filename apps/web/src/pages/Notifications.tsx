import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import {
  fetchNotifications,
  markNotificationsRead,
  type Notification,
} from '../api/notifications';

function renderParams(params: Record<string, unknown>): Record<string, unknown> {
  const numbers = params.numbers;
  return { ...params, numbers: Array.isArray(numbers) ? numbers.join(', ') : numbers };
}

export function Notifications() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchNotifications(token)
      .then((r) => {
        setItems(r.notifications);
        setLastReadAt(r.lastReadAt);
        return markNotificationsRead(token);
      })
      .catch(() => setError(true));
  }, [token]);

  const dateFmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar' : 'en', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-bold">{t('notif.title')}</h1>
      {error && <p className="text-red-600">{t('tombola.loadError')}</p>}
      <ul className="divide-y rounded border">
        {items.map((n, idx) => {
          const unread = !lastReadAt || n.createdAt > lastReadAt;
          return (
            <li key={idx} className={`p-3 ${unread ? 'bg-blue-50' : ''}`}>
              <p className="text-sm">{t(`notif.${n.type}`, renderParams(n.params))}</p>
              <p className="text-xs text-gray-400">{dateFmt.format(new Date(n.createdAt))}</p>
            </li>
          );
        })}
        {!items.length && !error && <li className="p-3 text-gray-500">{t('notif.empty')}</li>}
      </ul>
    </div>
  );
}
