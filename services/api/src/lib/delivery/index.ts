import type { DeliveryProvider } from './provider';
import { StubSender } from './stub-sender';
import { WhatsAppSender } from './whatsapp-sender';

export * from './provider';
export { StubSender } from './stub-sender';
export { WhatsAppSender } from './whatsapp-sender';

export function getDeliveryProvider(env: Record<string, string | undefined>): DeliveryProvider {
  if (env.OTP_DELIVERY === 'whatsapp') {
    if (!env.WHATSAPP_SECRET_ID) throw new Error('WHATSAPP_SECRET_ID required for whatsapp delivery');
    return new WhatsAppSender(env.WHATSAPP_SECRET_ID);
  }
  return new StubSender();
}
