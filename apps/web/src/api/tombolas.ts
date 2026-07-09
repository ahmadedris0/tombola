import { apiBaseUrl } from '../auth/config';
import type { Tombola, NumberCell } from '@tombola/shared';

export type GroupedTombolas = Record<string, Tombola[]>;

export async function fetchTombolas(): Promise<GroupedTombolas> {
  const res = await fetch(`${apiBaseUrl}/tombolas`);
  if (!res.ok) throw new Error('failed to load tombolas');
  return res.json();
}

export async function fetchTombola(id: string): Promise<Tombola> {
  const res = await fetch(`${apiBaseUrl}/tombolas/${id}`);
  if (!res.ok) throw new Error('not_found');
  return res.json();
}

export async function fetchNumbers(id: string): Promise<NumberCell[]> {
  const res = await fetch(`${apiBaseUrl}/tombolas/${id}/numbers`);
  if (!res.ok) throw new Error('failed to load numbers');
  return (await res.json()).numbers as NumberCell[];
}
