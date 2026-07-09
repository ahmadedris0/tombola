import { randomInt } from 'node:crypto';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';
import { getTombola, listNumbers } from './tombolas';

const RNG_SOURCE = 'crypto.randomInt';

export type DrawErrorCode = 'not_found' | 'not_drawable' | 'already_drawn' | 'no_eligible';

export class DrawError extends Error {
  constructor(public code: DrawErrorCode) {
    super(code);
    this.name = 'DrawError';
  }
}

export interface DrawResult {
  winningNumber: number;
  winnerUserId?: string;
  winnerName?: string;
  poolSize: number;
  drawnAt: string;
}

export async function runDraw(tombolaId: string, adminId: string): Promise<DrawResult> {
  const tombola = await getTombola(tombolaId);
  if (!tombola) throw new DrawError('not_found');
  if (tombola.status === 'finished') throw new DrawError('already_drawn');
  if (tombola.status !== 'active' && tombola.status !== 'closed') throw new DrawError('not_drawable');

  const numbers = await listNumbers(tombolaId);
  const pool =
    tombola.drawPoolMode === 'full_grid'
      ? numbers.map((n) => n.number)
      : numbers.filter((n) => n.state === 'confirmed').map((n) => n.number);
  if (pool.length === 0) throw new DrawError('no_eligible');

  const winningNumber = pool[randomInt(0, pool.length)]!;
  const winCell = numbers.find((n) => n.number === winningNumber);
  const winnerUserId = winCell?.state === 'confirmed' ? winCell.ownerUserId : undefined;
  const winnerName = winCell?.state === 'confirmed' ? winCell.ownerName : undefined;
  const drawnAt = new Date().toISOString();

  // Atomic claim: only an active/closed tombola can transition to finished. Doubles as the lock.
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TOMBOLA#${tombolaId}`, SK: `TOMBOLA#${tombolaId}` },
        ConditionExpression: '#s IN (:active, :closed)',
        UpdateExpression:
          'SET #s = :finished, winningNumber = :wn, winnerUserId = :wu, winnerName = :wname, GSI1PK = :g1pk, GSI1SK = :g1sk',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':active': 'active',
          ':closed': 'closed',
          ':finished': 'finished',
          ':wn': winningNumber,
          ':wu': winnerUserId ?? null,
          ':wname': winnerName ?? null,
          ':g1pk': 'TOMBOLA#STATUS#finished',
          ':g1sk': `${drawnAt}#${tombolaId}`,
        },
      }),
    );
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') {
      throw new DrawError('already_drawn');
    }
    throw e;
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `TOMBOLA#${tombolaId}`,
        SK: 'DRAW',
        tombolaId,
        drawnAt,
        drawnByAdminId: adminId,
        poolSnapshot: pool,
        rngSource: RNG_SOURCE,
        winningNumber,
        winnerUserId: winnerUserId ?? null,
        winnerName: winnerName ?? null,
      },
    }),
  );

  return { winningNumber, winnerUserId, winnerName, poolSize: pool.length, drawnAt };
}

export async function getDrawAudit(tombolaId: string): Promise<Record<string, unknown> | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: `TOMBOLA#${tombolaId}`, SK: 'DRAW' } }),
  );
  return res.Item ?? null;
}
