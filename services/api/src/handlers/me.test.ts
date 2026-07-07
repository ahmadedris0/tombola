import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock, updateMock } = vi.hoisted(() => ({ getMock: vi.fn(), updateMock: vi.fn() }));
vi.mock('../repository/users', () => ({ getUserBySub: getMock, updateUserProfile: updateMock }));

import { getMe, updateMe } from './me';

function evt(claims: Record<string, string>, body?: unknown) {
  return {
    requestContext: { authorizer: { jwt: { claims } } },
    body: body ? JSON.stringify(body) : undefined,
  } as never;
}

beforeEach(() => {
  getMock.mockReset();
  updateMock.mockReset();
});

describe('GET /me', () => {
  it('returns the user profile for the token subject', async () => {
    getMock.mockResolvedValue({ userId: 'u1', fullName: 'Ahmad E', locale: 'en', phoneE164: '+961701' });
    const res = await getMe(evt({ sub: 'u1' }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).fullName).toBe('Ahmad E');
  });
  it('returns 404 when the mirror is missing', async () => {
    getMock.mockResolvedValue(null);
    const res = await getMe(evt({ sub: 'ghost' }));
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /me', () => {
  it('updates name and locale and returns 200', async () => {
    updateMock.mockResolvedValue(undefined);
    const res = await updateMe(evt({ sub: 'u1' }, { fullName: 'New Name', locale: 'ar' }));
    expect(res.statusCode).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('u1', 'New Name', 'ar');
  });
  it('returns 400 on invalid body', async () => {
    const res = await updateMe(evt({ sub: 'u1' }, { fullName: '', locale: 'zz' }));
    expect(res.statusCode).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
