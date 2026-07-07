import { describe, it, expect } from 'vitest';
import { handler } from './pre-signup';

describe('pre-signup', () => {
  it('passes through a valid E.164 phone username', async () => {
    const event = { userName: '+96170123456', request: { userAttributes: {} }, response: {} } as never;
    const out = await handler(event);
    expect(out).toBeDefined();
  });
  it('rejects a malformed phone username', async () => {
    const event = { userName: '070bad', request: { userAttributes: {} }, response: {} } as never;
    await expect(handler(event)).rejects.toThrow();
  });
});
