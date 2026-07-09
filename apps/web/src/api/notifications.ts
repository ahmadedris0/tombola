import { apiBaseUrl } from '../auth/config';

export interface Notification {
  type: string;
  params: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  lastReadAt: string | null;
}

export async function fetchNotifications(token: string): Promise<NotificationsResponse> {
  const res = await fetch(`${apiBaseUrl}/me/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export async function markNotificationsRead(token: string): Promise<void> {
  await fetch(`${apiBaseUrl}/me/notifications/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function unreadCount(list: Notification[], lastReadAt: string | null): number {
  if (!lastReadAt) return list.length;
  return list.filter((n) => n.createdAt > lastReadAt).length;
}
