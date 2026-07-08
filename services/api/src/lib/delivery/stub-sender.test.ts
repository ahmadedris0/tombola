import { describe, it, expect, vi } from 'vitest';
import { StubSender } from './stub-sender';

describe('StubSender', () => {
  it('logs the code (persistence is handled by the auth handler)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new StubSender().send({ phoneE164: '+96170123456', code: '123456', locale: 'en' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('123456'));
    logSpy.mockRestore();
  });
});
