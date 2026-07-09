import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  getTombola: vi.fn(),
  getUserBySub: vi.fn(),
  reserveNumbers: vi.fn(),
  cancelNumbers: vi.fn(),
  countUserPending: vi.fn(),
  listUserReservations: vi.fn(),
  createPayment: vi.fn(),
}));
vi.mock('../repository/tombolas', () => ({ getTombola: h.getTombola }));
vi.mock('../repository/users', () => ({ getUserBySub: h.getUserBySub }));
vi.mock('../repository/payments', () => ({ createPayment: h.createPayment }));
vi.mock('../repository/reservations', async (orig) => {
  const actual = await orig<typeof import('../repository/reservations')>();
  return {
    ...actual,
    reserveNumbers: h.reserveNumbers,
    cancelNumbers: h.cancelNumbers,
    countUserPending: h.countUserPending,
    listUserReservations: h.listUserReservations,
  };
});

import { reserve, cancel } from './reservations';
import { ReserveConflictError } from '../repository/reservations';

const activeTombola = {
  tombolaId: 't1',
  status: 'active',
  pricePerNumber: 10,
  currency: 'USD',
  reservationWindowMinutes: 60,
  whishNumberOverride: '',
};

function evt(numbers: number[], name = 'Ahmad Edris') {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', name } } } },
    pathParameters: { id: 't1' },
    body: JSON.stringify({ numbers }),
  } as never;
}

beforeEach(() => Object.values(h).forEach((m) => m.mockReset()));

describe('reserve', () => {
  it('reserves and returns payment instructions (masked amount, whish, expiry)', async () => {
    h.getTombola.mockResolvedValue(activeTombola);
    h.getUserBySub.mockResolvedValue({ fullName: 'Ahmad Edris' });
    h.countUserPending.mockResolvedValue(0);
    h.reserveNumbers.mockResolvedValue({ reserved: [5, 6], reservationExpiresAt: '2026-07-09T12:00:00.000Z' });
    process.env.WHISH_NUMBER = '70999888';
    const res = await reserve(evt([5, 6]));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.amount).toBe(20);
    expect(body.whishNumber).toBe('70999888');
    expect(body.reservationExpiresAt).toBeTruthy();
    // masked owner name passed to the repository
    expect(h.reserveNumbers.mock.calls[0]![0].ownerName).toBe('Ahmad E.');
  });

  it('rejects when the tombola is not active', async () => {
    h.getTombola.mockResolvedValue({ ...activeTombola, status: 'upcoming' });
    const res = await reserve(evt([5]));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toBe('not_active');
  });

  it('enforces the pending cap', async () => {
    h.getTombola.mockResolvedValue(activeTombola);
    h.countUserPending.mockResolvedValue(10);
    const res = await reserve(evt([5]));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toBe('cap_exceeded');
    expect(h.reserveNumbers).not.toHaveBeenCalled();
  });

  it('returns 409 with the conflicting numbers when a hold loses the race', async () => {
    h.getTombola.mockResolvedValue(activeTombola);
    h.countUserPending.mockResolvedValue(0);
    h.reserveNumbers.mockRejectedValue(new ReserveConflictError([6]));
    const res = await reserve(evt([5, 6]));
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body!).conflicts).toEqual([6]);
  });
});

describe('cancel', () => {
  it('releases the caller reserved numbers', async () => {
    h.cancelNumbers.mockResolvedValue([5]);
    const res = await cancel(evt([5]));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).released).toEqual([5]);
    expect(h.cancelNumbers).toHaveBeenCalledWith('t1', [5], 'u1');
  });
});
