import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { json, type AuthedEvent } from '../lib/http';
import { listVisibleTombolas, getTombola, listNumbers } from '../repository/tombolas';

const HIDDEN_FROM_PUBLIC = new Set(['draft', 'cancelled']);

export const list = async (): Promise<APIGatewayProxyStructuredResultV2> => {
  const grouped = await listVisibleTombolas();
  return json(200, grouped);
};

export const get = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const tombola = await getTombola(id);
  if (!tombola || HIDDEN_FROM_PUBLIC.has(tombola.status)) return json(404, { error: 'not_found' });
  return json(200, tombola);
};

export const numbers = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const tombola = await getTombola(id);
  if (!tombola || HIDDEN_FROM_PUBLIC.has(tombola.status)) return json(404, { error: 'not_found' });
  const cells = await listNumbers(id);
  cells.sort((a, b) => a.number - b.number);
  return json(200, { numbers: cells });
};
