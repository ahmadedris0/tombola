import { releaseExpired, markExpiringForReminder } from '../repository/reservations';
import { expirePendingPayment } from '../repository/payments';
import { notify } from '../lib/notify';

const REMINDER_WINDOW_MS = 15 * 60_000;

/** EventBridge (rate 1 min): releases overdue holds, expires their payments, and sends T-15 reminders. */
export const handler = async (): Promise<{ released: number; reminded: number }> => {
  const now = new Date();
  const nowIso = now.toISOString();

  const { released, paymentIds, holders } = await releaseExpired(nowIso);
  for (const pid of paymentIds) await expirePendingPayment(pid);
  for (const h of holders) {
    await notify(h.userId, 'reservation_expired', { tombolaId: h.tombolaId, number: h.number });
  }

  const untilIso = new Date(now.getTime() + REMINDER_WINDOW_MS).toISOString();
  const reminders = await markExpiringForReminder(nowIso, untilIso);
  for (const h of reminders) {
    await notify(h.userId, 'expiry_reminder', { tombolaId: h.tombolaId, number: h.number });
  }

  if (released > 0 || reminders.length > 0) {
    console.log(`[sweep] released ${released}, reminded ${reminders.length}`);
  }
  return { released, reminded: reminders.length };
};
