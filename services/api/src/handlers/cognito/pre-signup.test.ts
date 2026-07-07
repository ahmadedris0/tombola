import { describe, it, expect } from 'vitest';
import { handler } from './pre-signup';

describe('pre-signup', () => {
  it('passes through a valid E.164 phone attribute', async () => {
    const event = {
      userName: 'uuid-abc',
      request: { userAttributes: { phone_number: '+96170123456' } },
      response: {},
    } as never;
    const out = await handler(event);
    expect(out).toBeDefined();
  });
  it('rejects a malformed phone attribute', async () => {
    const event = {
      userName: 'uuid-abc',
      request: { userAttributes: { phone_number: '070bad' } },
      response: {},
    } as never;
    await expect(handler(event)).rejects.toThrow();
  });
});
