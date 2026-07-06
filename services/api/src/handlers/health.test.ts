import { describe, it, expect } from 'vitest';
import { handler } from './health';

describe('health handler', () => {
  it('returns 200 with status ok and the stage', async () => {
    process.env.STAGE = 'dev';
    const res = await handler();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? '');
    expect(body.status).toBe('ok');
    expect(body.stage).toBe('dev');
  });
});
