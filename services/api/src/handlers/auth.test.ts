import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  putOtp: vi.fn(),
  getOtp: vi.fn(),
  deleteOtp: vi.fn(),
  incrementResendCount: vi.fn(),
  putUserMirror: vi.fn(),
  send: vi.fn(),
  cognitoSignUp: vi.fn(),
  cognitoConfirm: vi.fn(),
  cognitoGetUser: vi.fn(),
  cognitoSetPassword: vi.fn(),
}));

vi.mock('../repository/otp-store', () => ({
  putOtp: h.putOtp,
  getOtp: h.getOtp,
  deleteOtp: h.deleteOtp,
  incrementResendCount: h.incrementResendCount,
}));
vi.mock('../repository/users', () => ({ putUserMirror: h.putUserMirror }));
vi.mock('../lib/delivery/index', () => ({ getDeliveryProvider: () => ({ send: h.send }) }));
vi.mock('../lib/cognito-admin', () => ({
  cognitoSignUp: h.cognitoSignUp,
  cognitoConfirm: h.cognitoConfirm,
  cognitoGetUser: h.cognitoGetUser,
  cognitoSetPassword: h.cognitoSetPassword,
}));

import { register, verify, resend, reset } from './auth';

const evt = (body: unknown) => ({ body: JSON.stringify(body) }) as never;

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
});

describe('register', () => {
  it('creates the user, stores an OTP, and delivers it', async () => {
    h.cognitoSignUp.mockResolvedValue(undefined);
    h.incrementResendCount.mockResolvedValue(1);
    const res = await register(evt({ fullName: 'A', phoneE164: '+96170123456', password: 'Passw0rd1', locale: 'en' }));
    expect(res.statusCode).toBe(200);
    expect(h.putOtp).toHaveBeenCalledWith('+96170123456', 'signup', expect.stringMatching(/^\d{6}$/));
    expect(h.send).toHaveBeenCalledWith(expect.objectContaining({ phoneE164: '+96170123456' }));
  });

  it('rejects a bad phone before touching Cognito', async () => {
    const res = await register(evt({ fullName: 'A', phoneE164: 'bad', password: 'Passw0rd1', locale: 'en' }));
    expect(res.statusCode).toBe(400);
    expect(h.cognitoSignUp).not.toHaveBeenCalled();
  });

  it('surfaces UsernameExistsException from Cognito', async () => {
    h.cognitoSignUp.mockRejectedValue(Object.assign(new Error('x'), { name: 'UsernameExistsException' }));
    const res = await register(evt({ fullName: 'A', phoneE164: '+96170123456', password: 'Passw0rd1', locale: 'en' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toBe('UsernameExistsException');
  });
});

describe('verify', () => {
  it('confirms the user and writes the mirror on a matching code', async () => {
    h.getOtp.mockResolvedValue('123456');
    h.cognitoGetUser.mockResolvedValue({ sub: 'u1', name: 'A', locale: 'ar' });
    const res = await verify(evt({ phoneE164: '+96170123456', code: '123456' }));
    expect(res.statusCode).toBe(200);
    expect(h.cognitoConfirm).toHaveBeenCalledWith('+96170123456');
    expect(h.putUserMirror).toHaveBeenCalledWith(expect.objectContaining({ sub: 'u1', locale: 'ar', role: 'user' }));
    expect(h.deleteOtp).toHaveBeenCalledWith('+96170123456', 'signup');
  });

  it('returns CodeMismatchException on a wrong code', async () => {
    h.getOtp.mockResolvedValue('123456');
    const res = await verify(evt({ phoneE164: '+96170123456', code: '000000' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toBe('CodeMismatchException');
    expect(h.cognitoConfirm).not.toHaveBeenCalled();
  });

  it('returns ExpiredCodeException when no OTP is stored', async () => {
    h.getOtp.mockResolvedValue(null);
    const res = await verify(evt({ phoneE164: '+96170123456', code: '123456' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toBe('ExpiredCodeException');
  });
});

describe('resend', () => {
  it('blocks past the cap', async () => {
    h.incrementResendCount.mockResolvedValue(4);
    const res = await resend(evt({ phoneE164: '+96170123456' }));
    expect(res.statusCode).toBe(429);
    expect(h.send).not.toHaveBeenCalled();
  });
});

describe('reset', () => {
  it('sets a new password after a matching reset code', async () => {
    h.getOtp.mockResolvedValue('654321');
    const res = await reset(evt({ phoneE164: '+96170123456', code: '654321', newPassword: 'NewPass12' }));
    expect(res.statusCode).toBe(200);
    expect(h.cognitoSetPassword).toHaveBeenCalledWith('+96170123456', 'NewPass12');
  });
});
