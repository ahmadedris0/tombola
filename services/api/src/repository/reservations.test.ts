import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { reserveNumbers, releaseExpired, ReserveConflictError } from './reservations';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('reserveNumbers', () => {
  it('writes conditional updates for each number and returns the expiry', async () => {
    mock.on(TransactWriteCommand).resolves({});
    const res = await reserveNumbers({
      tombolaId: 't1',
      numbers: [5, 6],
      userId: 'u1',
      ownerName: 'Ahmad E.',
      windowMinutes: 60,
    });
    expect(res.reserved).toEqual([5, 6]);
    expect(res.reservationExpiresAt).toMatch(/Z$/);
    const items = mock.commandCalls(TransactWriteCommand)[0]!.args[0].input.TransactItems!;
    expect(items).toHaveLength(2);
    expect(items[0]!.Update!.ConditionExpression).toContain(':available');
  });

  it('throws ReserveConflictError with the cells that failed the condition', async () => {
    const err = Object.assign(new Error('cancelled'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }],
    });
    mock.on(TransactWriteCommand).rejects(err);
    await expect(
      reserveNumbers({ tombolaId: 't1', numbers: [5, 6], userId: 'u1', ownerName: 'A', windowMinutes: 60 }),
    ).rejects.toMatchObject({ conflicts: [6] });
    await expect(
      reserveNumbers({ tombolaId: 't1', numbers: [5, 6], userId: 'u1', ownerName: 'A', windowMinutes: 60 }),
    ).rejects.toBeInstanceOf(ReserveConflictError);
  });
});

describe('releaseExpired', () => {
  it('releases each overdue reserved hold and counts them', async () => {
    mock.on(QueryCommand).resolves({
      Items: [
        { PK: 'TOMBOLA#t1', SK: 'NUMBER#005' },
        { PK: 'TOMBOLA#t1', SK: 'NUMBER#006' },
      ],
    });
    mock.on(UpdateCommand).resolves({});
    const released = await releaseExpired('2026-07-09T12:00:00.000Z');
    expect(released).toBe(2);
    const q = mock.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(q.IndexName).toBe('GSI3');
    expect(q.KeyConditionExpression).toContain('GSI3SK < :now');
  });

  it('skips holds already confirmed/cancelled (condition fails) without throwing', async () => {
    mock.on(QueryCommand).resolves({ Items: [{ PK: 'TOMBOLA#t1', SK: 'NUMBER#005' }] });
    mock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    expect(await releaseExpired('2026-07-09T12:00:00.000Z')).toBe(0);
  });
});
