import { releaseExpired } from '../repository/reservations';
import { expirePendingPayment } from '../repository/payments';

/** EventBridge (rate 1 min) → releases overdue reserved holds and expires their payments. */
export const handler = async (): Promise<{ released: number }> => {
  const { released, paymentIds } = await releaseExpired(new Date().toISOString());
  for (const pid of paymentIds) await expirePendingPayment(pid);
  if (released > 0) console.log(`[sweep] released ${released} expired hold(s), ${paymentIds.length} payment(s)`);
  return { released };
};
