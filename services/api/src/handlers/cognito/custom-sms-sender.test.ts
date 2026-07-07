import { describe, it, expect, vi, beforeEach } from 'vitest';

const { decryptMock, sendMock, incrementMock } = vi.hoisted(() => ({
  decryptMock: vi.fn(),
  sendMock: vi.fn(),
  incrementMock: vi.fn(),
}));

vi.mock('@aws-sdk/client-kms', () => ({
  KMSClient: class {
    send = decryptMock;
  },
  DecryptCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock('../../lib/delivery/index', () => ({
  getDeliveryProvider: () => ({ send: sendMock }),
}));
vi.mock('../../repository/otp-store', () => ({ incrementResendCount: incrementMock }));

import { handler } from './custom-sms-sender';

const baseEvent = {
  triggerSource: 'CustomSMSSender_SignUp',
  request: { code: Buffer.from('cipher').toString('base64'), userAttributes: { phone_number: '+96170123456', locale: 'en' } },
} as never;

beforeEach(() => {
  decryptMock.mockReset();
  sendMock.mockReset();
  incrementMock.mockReset();
  decryptMock.mockResolvedValue({ Plaintext: new TextEncoder().encode('123456') });
});

describe('custom-sms-sender', () => {
  it('decrypts the code and delivers it when under the cap', async () => {
    incrementMock.mockResolvedValue(1);
    await handler(baseEvent);
    expect(sendMock).toHaveBeenCalledWith({ phoneE164: '+96170123456', code: '123456', locale: 'en' });
  });

  it('throws (blocks delivery) when the resend cap is exceeded', async () => {
    incrementMock.mockResolvedValue(4);
    await expect(handler(baseEvent)).rejects.toThrow();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
