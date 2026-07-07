import { describe, it, expect, afterEach } from 'vitest';
import { handler } from './health';

const originalStage = process.env.STAGE;

afterEach(() => {
  if (originalStage === undefined) {
    delete process.env.STAGE;
  } else {
    process.env.STAGE = originalStage;
  }
});

describe('health handler', () => {
  it('returns 200 with status ok and the stage', async () => {
    process.env.STAGE = 'dev';
    const res = await handler();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? '');
    expect(body.status).toBe('ok');
    expect(body.stage).toBe('dev');
  });

  it("falls back to stage 'unknown' when STAGE is unset", async () => {
    delete process.env.STAGE;
    const res = await handler();
    const body = JSON.parse(res.body ?? '');
    expect(body.stage).toBe('unknown');
  });
});
