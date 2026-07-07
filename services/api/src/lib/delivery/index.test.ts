import { describe, it, expect } from 'vitest';
import { getDeliveryProvider } from './index';
import { StubSender } from './stub-sender';
import { WhatsAppSender } from './whatsapp-sender';

describe('getDeliveryProvider', () => {
  it('returns StubSender by default', () => {
    expect(getDeliveryProvider({})).toBeInstanceOf(StubSender);
    expect(getDeliveryProvider({ OTP_DELIVERY: 'stub' })).toBeInstanceOf(StubSender);
  });
  it('returns WhatsAppSender when OTP_DELIVERY=whatsapp', () => {
    expect(
      getDeliveryProvider({ OTP_DELIVERY: 'whatsapp', WHATSAPP_SECRET_ID: 's' }),
    ).toBeInstanceOf(WhatsAppSender);
  });
  it('throws if whatsapp is selected without a secret id', () => {
    expect(() => getDeliveryProvider({ OTP_DELIVERY: 'whatsapp' })).toThrow();
  });
});
