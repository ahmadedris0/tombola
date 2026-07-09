import { describe, it, expect, vi, beforeEach } from 'vitest';

const r = vi.hoisted(() => ({
  listVisibleTombolas: vi.fn(),
  getTombola: vi.fn(),
  listNumbers: vi.fn(),
}));
vi.mock('../repository/tombolas', () => r);

import { list, get, numbers } from './tombolas';

const evt = (id: string) => ({ pathParameters: { id } }) as never;

beforeEach(() => Object.values(r).forEach((m) => m.mockReset()));

describe('public tombola discovery', () => {
  it('list returns the grouped visible tombolas', async () => {
    r.listVisibleTombolas.mockResolvedValue({ active: [{ tombolaId: 't1' }], upcoming: [], finished: [] });
    const res = await list();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).active).toHaveLength(1);
  });

  it('get returns an active tombola', async () => {
    r.getTombola.mockResolvedValue({ tombolaId: 't1', status: 'active' });
    const res = await get(evt('t1'));
    expect(res.statusCode).toBe(200);
  });

  it('get hides a draft tombola from the public (404)', async () => {
    r.getTombola.mockResolvedValue({ tombolaId: 't1', status: 'draft' });
    const res = await get(evt('t1'));
    expect(res.statusCode).toBe(404);
  });

  it('numbers returns cells sorted ascending for a visible tombola', async () => {
    r.getTombola.mockResolvedValue({ tombolaId: 't1', status: 'active' });
    r.listNumbers.mockResolvedValue([{ number: 3 }, { number: 1 }, { number: 2 }]);
    const res = await numbers(evt('t1'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).numbers.map((c: { number: number }) => c.number)).toEqual([1, 2, 3]);
  });

  it('numbers is 404 for a hidden tombola', async () => {
    r.getTombola.mockResolvedValue({ tombolaId: 't1', status: 'cancelled' });
    const res = await numbers(evt('t1'));
    expect(res.statusCode).toBe(404);
  });
});
