import { putNotification } from '../repository/notifications';

/**
 * Records an in-app notification (always-on channel). The WhatsApp channel reuses the M1
 * delivery path and is logged here until Meta utility templates are approved (then wire the
 * real utility-template send behind the OTP_DELIVERY flag).
 */
export async function notify(
  userId: string,
  type: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  await putNotification(userId, type, params);
  console.log(`[notify] ${type} -> user ${userId}`);
}
