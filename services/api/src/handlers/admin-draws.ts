import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { json, claimSub, type AuthedEvent } from '../lib/http';
import { runDraw, getDrawAudit, DrawError } from '../repository/draws';

const STATUS: Record<string, number> = {
  not_found: 404,
  already_drawn: 409,
  not_drawable: 400,
  no_eligible: 400,
};

export const draw = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  try {
    return json(200, await runDraw(id, claimSub(event)));
  } catch (e) {
    if (e instanceof DrawError) return json(STATUS[e.code] ?? 400, { error: e.code });
    throw e;
  }
};

export const audit = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id ?? '';
  const a = await getDrawAudit(id);
  if (!a) return json(404, { error: 'not_found' });
  return json(200, a);
};
