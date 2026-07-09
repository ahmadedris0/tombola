import { releaseExpired } from '../repository/reservations';

/** EventBridge (rate 1 min) → releases overdue reserved holds back to available. */
export const handler = async (): Promise<{ released: number }> => {
  const released = await releaseExpired(new Date().toISOString());
  if (released > 0) console.log(`[sweep] released ${released} expired reservation(s)`);
  return { released };
};
