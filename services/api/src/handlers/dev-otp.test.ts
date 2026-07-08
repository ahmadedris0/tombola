import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('../repository/otp-store', () => ({ getOtp: getMock }));

import { handler } from './dev-otp';

beforeEach(() => {
  getMock.mockReset();
  process.env.OTP_DELIVERY = 'stub';
});

function evt(phone: string) {
  return { pathParameters: { phone } } as never;
}

describe('GET /dev/otp/{phone}', () => {
  it('returns the stored code in stub mode', async () => {
    getMock.mockResolvedValue('123456');
    const res = await handler(evt('+96170123456'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).code).toBe('123456');
  });
  it('is disabled when OTP_DELIVERY=whatsapp', async () => {
    process.env.OTP_DELIVERY = 'whatsapp';
    const res = await handler(evt('+96170123456'));
    expect(res.statusCode).toBe(404);
    expect(getMock).not.toHaveBeenCalled();
  });
});
