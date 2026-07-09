import { apiBaseUrl } from '../auth/config';
import type { Tombola } from '@tombola/shared';

async function authFetch(
  token: string,
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function listAdminTombolas(token: string): Promise<Tombola[]> {
  const res = await authFetch(token, '/admin/tombolas', 'GET');
  if (!res.ok) throw new Error('failed');
  return (await res.json()).tombolas as Tombola[];
}

export async function createTombola(token: string, input: unknown): Promise<Tombola> {
  const res = await authFetch(token, '/admin/tombolas', 'POST', input);
  if (!res.ok) throw new Error('create_failed');
  return res.json();
}

export async function updateTombola(token: string, id: string, input: unknown): Promise<Tombola> {
  const res = await authFetch(token, `/admin/tombolas/${id}`, 'PUT', input);
  if (!res.ok) throw new Error('update_failed');
  return res.json();
}

export async function duplicateTombola(token: string, id: string): Promise<void> {
  const res = await authFetch(token, `/admin/tombolas/${id}/duplicate`, 'POST');
  if (!res.ok) throw new Error('duplicate_failed');
}

export async function deleteTombola(token: string, id: string): Promise<void> {
  const res = await authFetch(token, `/admin/tombolas/${id}`, 'DELETE');
  if (!res.ok) throw new Error('delete_failed');
}

export async function drawTombola(token: string, id: string): Promise<void> {
  const res = await authFetch(token, `/admin/tombolas/${id}/draw`, 'POST');
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'draw_failed');
  }
}
