import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { maskName } from '@tombola/shared';
import { json, claimSub, parseBody, type AuthedEvent } from '../lib/http';
import { getTombola } from '../repository/tombolas';
import { getUserBySub } from '../repository/users';
import {
  reserveNumbers,
  cancelNumbers,
  countUserPending,
  listUserReservations,
  ReserveConflictError,
} from '../repository/reservations';

const RESERVATION_CAP = Number(process.env.RESERVATION_CAP ?? '10');

const numbersSchema = z.object({ numbers: z.array(z.number().int().positive()).min(1).max(25) });

export const reserve = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const userId = claimSub(event);
  const tombolaId = event.pathParameters?.id ?? '';
  const parsed = numbersSchema.safeParse(parseBody(event));
  if (!parsed.success) return json(400, { error: 'invalid_body' });
  const { numbers } = parsed.data;

  const tombola = await getTombola(tombolaId);
  if (!tombola) return json(404, { error: 'not_found' });
  if (tombola.status !== 'active') return json(400, { error: 'not_active' });

  const pending = await countUserPending(userId);
  if (pending + numbers.length > RESERVATION_CAP) {
    return json(400, { error: 'cap_exceeded', cap: RESERVATION_CAP, pending });
  }

  const mirror = await getUserBySub(userId);
  try {
    const result = await reserveNumbers({
      tombolaId,
      numbers,
      userId,
      ownerName: maskName(String(mirror?.fullName ?? '')),
      windowMinutes: tombola.reservationWindowMinutes,
    });
    const whishNumber = tombola.whishNumberOverride || process.env.WHISH_NUMBER || 'TBD';
    return json(200, {
      numbers: result.reserved,
      reservationExpiresAt: result.reservationExpiresAt,
      whishNumber,
      amount: tombola.pricePerNumber * numbers.length,
      currency: tombola.currency,
    });
  } catch (e) {
    if (e instanceof ReserveConflictError) {
      return json(409, { error: 'conflict', conflicts: e.conflicts });
    }
    throw e;
  }
};

export const cancel = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const userId = claimSub(event);
  const tombolaId = event.pathParameters?.id ?? '';
  const parsed = numbersSchema.safeParse(parseBody(event));
  if (!parsed.success) return json(400, { error: 'invalid_body' });
  const released = await cancelNumbers(tombolaId, parsed.data.numbers, userId);
  return json(200, { released });
};

export const mine = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const userId = claimSub(event);
  return json(200, { reservations: await listUserReservations(userId) });
};
