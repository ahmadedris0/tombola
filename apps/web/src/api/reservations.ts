import { apiBaseUrl } from '../auth/config';

export interface PaymentInstructions {
  paymentId: string;
  numbers: number[];
  reservationExpiresAt: string;
  whishNumber: string;
  amount: number;
  currency: string;
}

export async function reserveNumbers(
  token: string,
  tombolaId: string,
  numbers: number[],
): Promise<PaymentInstructions> {
  const res = await fetch(`${apiBaseUrl}/tombolas/${tombolaId}/reserve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ numbers }),
  });
  if (res.status === 409) throw new Error('conflict');
  if (res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'reserve_failed');
  }
  if (!res.ok) throw new Error('reserve_failed');
  return res.json();
}

export async function cancelReservation(
  token: string,
  tombolaId: string,
  numbers: number[],
): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/tombolas/${tombolaId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ numbers }),
  });
  if (!res.ok) throw new Error('cancel_failed');
}

export async function attachProof(
  token: string,
  paymentId: string,
  whishReference: string,
): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/me/payments/${paymentId}/proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ whishReference }),
  });
  if (!res.ok) throw new Error('proof_failed');
}
