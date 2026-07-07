import { describe, it, expect, vi, beforeEach } from 'vitest';

const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }));
vi.mock('../../repository/users', () => ({ putUserMirror: putMock }));

import { handler } from './post-confirmation';

beforeEach(() => putMock.mockReset());

describe('post-confirmation', () => {
  it('writes a user mirror on ConfirmSignUp', async () => {
    const event = {
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: { userAttributes: { sub: 'u1', phone_number: '+96170123456', name: 'Ahmad E', locale: 'ar' } },
    } as never;
    await handler(event);
    expect(putMock).toHaveBeenCalledWith({
      sub: 'u1',
      phoneE164: '+96170123456',
      fullName: 'Ahmad E',
      locale: 'ar',
      role: 'user',
    });
  });

  it('ignores non-signup trigger sources', async () => {
    const event = { triggerSource: 'PostConfirmation_ConfirmForgotPassword', request: { userAttributes: {} } } as never;
    await handler(event);
    expect(putMock).not.toHaveBeenCalled();
  });
});
