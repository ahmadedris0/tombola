import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { json, claimSub, type AuthedEvent } from '../lib/http';
import { listPendingPayments, getPayment, markPaymentReviewed } from '../repository/payments';
import { confirmNumbers, cancelNumbers } from '../repository/reservations';

export const list = async (): Promise<APIGatewayProxyStructuredResultV2> => {
  return json(200, { payments: await listPendingPayments() });
};

async function review(
  event: AuthedEvent,
  outcome: 'confirmed' | 'rejected',
): Promise<APIGatewayProxyStructuredResultV2> {
  const adminId = claimSub(event);
  const paymentId = event.pathParameters?.paymentId ?? '';
  const payment = await getPayment(paymentId);
  if (!payment) return json(404, { error: 'not_found' });
  if (payment.status !== 'pending') return json(400, { error: 'not_pending' });

  const tombolaId = payment.tombolaId as string;
  const numbers = payment.numbers as number[];
  const userId = payment.userId as string;

  if (outcome === 'confirmed') {
    await confirmNumbers(tombolaId, numbers, userId);
  } else {
    await cancelNumbers(tombolaId, numbers, userId);
  }
  await markPaymentReviewed(paymentId, outcome, adminId);
  return json(200, { ok: true });
}

export const confirm = (event: AuthedEvent) => review(event, 'confirmed');
export const reject = (event: AuthedEvent) => review(event, 'rejected');
