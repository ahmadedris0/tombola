import { describe, it, expect, vi, beforeEach } from 'vitest';

const r = vi.hoisted(() => ({
  createTombola: vi.fn(),
  updateTombola: vi.fn(),
  softDeleteTombola: vi.fn(),
  duplicateTombola: vi.fn(),
  listAllTombolas: vi.fn(),
  updateNumberLabel: vi.fn(),
}));
vi.mock('../repository/tombolas', () => r);

import { create, remove, list } from './admin-tombolas';

const validBody = {
  title: { en: 'Cars', ar: 'سيارات' },
  pricePerNumber: 10,
  prizeAmount: 400,
};

function evt(groups: string[] | undefined, body?: unknown, params?: Record<string, string>) {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: 'admin1', ...(groups ? { 'cognito:groups': groups } : {}) } } } },
    body: body ? JSON.stringify(body) : undefined,
    pathParameters: params,
  } as never;
}

beforeEach(() => Object.values(r).forEach((m) => m.mockReset()));

describe('admin tombola gating', () => {
  it('rejects a non-admin with 403', async () => {
    const res = await list(evt(undefined));
    expect(res.statusCode).toBe(403);
    expect(r.listAllTombolas).not.toHaveBeenCalled();
  });
  it('accepts the admin group as a stringified array', async () => {
    r.listAllTombolas.mockResolvedValue([]);
    const res = await list(evt('[admin]' as unknown as string[]));
    expect(res.statusCode).toBe(200);
  });
});

describe('create', () => {
  it('creates with defaults applied and returns 201', async () => {
    r.createTombola.mockResolvedValue({ tombolaId: 't1', gridSize: 100 });
    const res = await create(evt(['admin'], validBody));
    expect(res.statusCode).toBe(201);
    const passedInput = r.createTombola.mock.calls[0]![0];
    expect(passedInput.gridSize).toBe(100);
    expect(passedInput.currency).toBe('USD');
    expect(passedInput.status).toBe('draft');
  });
  it('rejects an invalid body with 400', async () => {
    const res = await create(evt(['admin'], { title: { en: 'x' } }));
    expect(res.statusCode).toBe(400);
    expect(r.createTombola).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  it('soft-deletes and returns 200', async () => {
    r.softDeleteTombola.mockResolvedValue(true);
    const res = await remove(evt(['admin'], undefined, { id: 't1' }));
    expect(res.statusCode).toBe(200);
    expect(r.softDeleteTombola).toHaveBeenCalledWith('t1');
  });
  it('returns 404 when missing', async () => {
    r.softDeleteTombola.mockResolvedValue(false);
    const res = await remove(evt(['admin'], undefined, { id: 'ghost' }));
    expect(res.statusCode).toBe(404);
  });
});
