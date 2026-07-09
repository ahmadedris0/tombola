import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import {
  createTombolaInputSchema,
  updateTombolaInputSchema,
  updateNumberLabelSchema,
} from '@tombola/shared';
import { json, claimSub, parseBody, type AuthedEvent } from '../lib/http';
import {
  createTombola,
  updateTombola,
  softDeleteTombola,
  duplicateTombola,
  listAllTombolas,
  updateNumberLabel,
} from '../repository/tombolas';

export const list = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  return json(200, { tombolas: await listAllTombolas() });
};

export const create = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const parsed = createTombolaInputSchema.safeParse(parseBody(event));
  if (!parsed.success) return json(400, { error: 'invalid_body', issues: parsed.error.issues });
  const tombola = await createTombola(parsed.data, claimSub(event));
  return json(201, tombola);
};

export const update = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const parsed = updateTombolaInputSchema.safeParse(parseBody(event));
  if (!parsed.success) return json(400, { error: 'invalid_body', issues: parsed.error.issues });
  const updated = await updateTombola(id, parsed.data);
  if (!updated) return json(404, { error: 'not_found' });
  return json(200, updated);
};

export const duplicate = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const created = await duplicateTombola(id, claimSub(event));
  if (!created) return json(404, { error: 'not_found' });
  return json(201, created);
};

export const remove = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const ok = await softDeleteTombola(id);
  if (!ok) return json(404, { error: 'not_found' });
  return json(200, { ok: true });
};

export const editNumber = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const n = Number(event.pathParameters?.n);
  if (!Number.isInteger(n)) return json(400, { error: 'invalid_number' });
  const parsed = updateNumberLabelSchema.safeParse(parseBody(event));
  if (!parsed.success) return json(400, { error: 'invalid_body' });
  await updateNumberLabel(id, n, parsed.data.labelEn, parsed.data.labelAr);
  return json(200, { ok: true });
};
