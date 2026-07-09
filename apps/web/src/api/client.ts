import { apiBaseUrl } from '../auth/config';

export async function apiFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
}
