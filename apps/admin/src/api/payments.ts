import { apiBaseUrl } from '../auth/config';

export interface AdminPayment {
  paymentId: string;
  tombolaId: string;
  numbers: number[];
  userId: string;
  amount: number;
  currency: string;
  whishReference?: string;
  createdAt: string;
}

async function authFetch(token: string, path: string, method: string): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listPendingPayments(token: string): Promise<AdminPayment[]> {
  const res = await authFetch(token, '/admin/payments', 'GET');
  if (!res.ok) throw new Error('failed');
  return (await res.json()).payments as AdminPayment[];
}

export async function confirmPayment(token: string, id: string): Promise<void> {
  const res = await authFetch(token, `/admin/payments/${id}/confirm`, 'POST');
  if (!res.ok) throw new Error('confirm_failed');
}

export async function rejectPayment(token: string, id: string): Promise<void> {
  const res = await authFetch(token, `/admin/payments/${id}/reject`, 'POST');
  if (!res.ok) throw new Error('reject_failed');
}
