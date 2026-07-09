import {
  TransactWriteCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

const RELEASE_UPDATE =
  'SET #s = :available REMOVE ownerUserId, ownerName, paymentId, reservedAt, reservationExpiresAt, GSI2PK, GSI2SK, GSI3PK, GSI3SK';

export interface ReserveResult {
  reserved: number[];
  reservationExpiresAt: string;
}

export class ReserveConflictError extends Error {
  constructor(public conflicts: number[]) {
    super('reservation_conflict');
    this.name = 'ReserveConflictError';
  }
}

/** Atomically reserves all requested numbers or none (TransactWriteItems, condition per cell). */
export async function reserveNumbers(params: {
  tombolaId: string;
  numbers: number[];
  userId: string;
  ownerName: string;
  windowMinutes: number;
  paymentId: string;
}): Promise<ReserveResult> {
  const { tombolaId, numbers, userId, ownerName, windowMinutes, paymentId } = params;
  const now = new Date();
  const nowIso = now.toISOString();
  const expIso = new Date(now.getTime() + windowMinutes * 60_000).toISOString();

  const TransactItems = numbers.map((n) => ({
    Update: {
      TableName: TABLE_NAME,
      Key: { PK: `TOMBOLA#${tombolaId}`, SK: `NUMBER#${pad(n)}` },
      ConditionExpression: '#s = :available',
      UpdateExpression:
        'SET #s = :reserved, ownerUserId = :uid, ownerName = :uname, paymentId = :pid, reservedAt = :now, reservationExpiresAt = :exp, GSI2PK = :g2pk, GSI2SK = :g2sk, GSI3PK = :g3pk, GSI3SK = :g3sk',
      ExpressionAttributeNames: { '#s': 'state' },
      ExpressionAttributeValues: {
        ':available': 'available',
        ':reserved': 'reserved',
        ':uid': userId,
        ':uname': ownerName,
        ':pid': paymentId,
        ':now': nowIso,
        ':exp': expIso,
        ':g2pk': `USER#${userId}`,
        ':g2sk': `TICKET#${tombolaId}#${pad(n)}`,
        ':g3pk': 'RESERVATION_EXPIRY',
        ':g3sk': `${expIso}#${tombolaId}#${pad(n)}`,
      },
    },
  }));

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems }));
    return { reserved: numbers, reservationExpiresAt: expIso };
  } catch (e) {
    const err = e as { name?: string; CancellationReasons?: { Code?: string }[] };
    if (err.name === 'TransactionCanceledException') {
      const reasons = err.CancellationReasons ?? [];
      const conflicts = numbers.filter((_, i) => reasons[i]?.Code === 'ConditionalCheckFailed');
      throw new ReserveConflictError(conflicts.length ? conflicts : numbers);
    }
    throw e;
  }
}

/** Releases the caller's own reserved numbers back to available. Returns those actually released. */
export async function cancelNumbers(
  tombolaId: string,
  numbers: number[],
  userId: string,
): Promise<number[]> {
  const released: number[] = [];
  for (const n of numbers) {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `TOMBOLA#${tombolaId}`, SK: `NUMBER#${pad(n)}` },
          ConditionExpression: '#s = :reserved AND ownerUserId = :uid',
          UpdateExpression: RELEASE_UPDATE,
          ExpressionAttributeNames: { '#s': 'state' },
          ExpressionAttributeValues: { ':reserved': 'reserved', ':available': 'available', ':uid': userId },
        }),
      );
      released.push(n);
    } catch (e) {
      if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
    }
  }
  return released;
}

/** Confirms (marks sold) the given reserved numbers owned by userId; stops their expiry. */
export async function confirmNumbers(
  tombolaId: string,
  numbers: number[],
  userId: string,
): Promise<number[]> {
  const confirmed: number[] = [];
  for (const n of numbers) {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `TOMBOLA#${tombolaId}`, SK: `NUMBER#${pad(n)}` },
          ConditionExpression: '#s = :reserved AND ownerUserId = :uid',
          UpdateExpression:
            'SET #s = :confirmed, confirmedAt = :now REMOVE reservationExpiresAt, GSI3PK, GSI3SK',
          ExpressionAttributeNames: { '#s': 'state' },
          ExpressionAttributeValues: {
            ':reserved': 'reserved',
            ':confirmed': 'confirmed',
            ':uid': userId,
            ':now': new Date().toISOString(),
          },
        }),
      );
      confirmed.push(n);
    } catch (e) {
      if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
    }
  }
  return confirmed;
}

/** Count of the caller's currently-reserved (pending) numbers, for the per-user cap. */
export async function countUserPending(userId: string): Promise<number> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      FilterExpression: '#s = :reserved',
      ExpressionAttributeNames: { '#s': 'state' },
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'TICKET#', ':reserved': 'reserved' },
      Select: 'COUNT',
    }),
  );
  return res.Count ?? 0;
}

export async function listUserReservations(userId: string): Promise<Record<string, unknown>[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'TICKET#' },
    }),
  );
  return (res.Items ?? []).map((i) => ({
    tombolaId: i.tombolaId,
    number: i.number,
    state: i.state,
    reservationExpiresAt: i.reservationExpiresAt,
  }));
}

/** Sweep: releases overdue reserved holds. Returns the count released + affected payment ids. */
export async function releaseExpired(
  nowIso: string,
  limit = 100,
): Promise<{ released: number; paymentIds: string[] }> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk AND GSI3SK < :now',
      ExpressionAttributeValues: { ':pk': 'RESERVATION_EXPIRY', ':now': nowIso },
      Limit: limit,
    }),
  );
  let released = 0;
  const paymentIds = new Set<string>();
  for (const item of res.Items ?? []) {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK as string, SK: item.SK as string },
          ConditionExpression: '#s = :reserved',
          UpdateExpression: RELEASE_UPDATE,
          ExpressionAttributeNames: { '#s': 'state' },
          ExpressionAttributeValues: { ':reserved': 'reserved', ':available': 'available' },
        }),
      );
      released++;
      if (item.paymentId) paymentIds.add(item.paymentId as string);
    } catch (e) {
      if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
    }
  }
  return { released, paymentIds: [...paymentIds] };
}
