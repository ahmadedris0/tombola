import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { json, claimSub, parseBody, type AuthedEvent } from '../lib/http';
import { listUserPayments, attachProof } from '../repository/payments';

export const mine = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  return json(200, { payments: await listUserPayments(claimSub(event)) });
};

const proofSchema = z.object({ whishReference: z.string().min(1).max(200) });

export const proof = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const userId = claimSub(event);
  const paymentId = event.pathParameters?.paymentId ?? '';
  const parsed = proofSchema.safeParse(parseBody(event));
  if (!parsed.success) return json(400, { error: 'invalid_body' });
  const ok = await attachProof(paymentId, userId, parsed.data.whishReference);
  return ok ? json(200, { ok: true }) : json(400, { error: 'not_allowed' });
};
