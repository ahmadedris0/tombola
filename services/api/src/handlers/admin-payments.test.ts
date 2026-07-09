import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  listPendingPayments: vi.fn(),
  getPayment: vi.fn(),
  markPaymentReviewed: vi.fn(),
  confirmNumbers: vi.fn(),
  cancelNumbers: vi.fn(),
}));
vi.mock('../repository/payments', () => ({
  listPendingPayments: h.listPendingPayments,
  getPayment: h.getPayment,
  markPaymentReviewed: h.markPaymentReviewed,
}));
vi.mock('../repository/reservations', () => ({
  confirmNumbers: h.confirmNumbers,
  cancelNumbers: h.cancelNumbers,
}));
vi.mock('../lib/notify', () => ({ notify: vi.fn() }));

import { confirm, reject } from './admin-payments';

const evt = (paymentId: string) =>
  ({ requestContext: { authorizer: { jwt: { claims: { sub: 'admin1' } } } }, pathParameters: { paymentId } }) as never;

const pending = { paymentId: 'p1', tombolaId: 't1', numbers: [5, 6], userId: 'u1', status: 'pending' };

beforeEach(() => Object.values(h).forEach((m) => m.mockReset()));

describe('confirm', () => {
  it('confirms the numbers and marks the payment confirmed', async () => {
    h.getPayment.mockResolvedValue(pending);
    const res = await confirm(evt('p1'));
    expect(res.statusCode).toBe(200);
    expect(h.confirmNumbers).toHaveBeenCalledWith('t1', [5, 6], 'u1');
    expect(h.markPaymentReviewed).toHaveBeenCalledWith('p1', 'confirmed', 'admin1');
  });
  it('404 when the payment is missing', async () => {
    h.getPayment.mockResolvedValue(null);
    expect((await confirm(evt('x'))).statusCode).toBe(404);
  });
  it('400 when the payment is not pending', async () => {
    h.getPayment.mockResolvedValue({ ...pending, status: 'confirmed' });
    const res = await confirm(evt('p1'));
    expect(res.statusCode).toBe(400);
    expect(h.confirmNumbers).not.toHaveBeenCalled();
  });
});

describe('reject', () => {
  it('releases the numbers and marks the payment rejected', async () => {
    h.getPayment.mockResolvedValue(pending);
    const res = await reject(evt('p1'));
    expect(res.statusCode).toBe(200);
    expect(h.cancelNumbers).toHaveBeenCalledWith('t1', [5, 6], 'u1');
    expect(h.markPaymentReviewed).toHaveBeenCalledWith('p1', 'rejected', 'admin1');
  });
});
