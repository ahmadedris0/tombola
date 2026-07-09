import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { runDraw, DrawError } from './draws';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

function withTombola(status: string, drawPoolMode = 'confirmed_only') {
  mock.on(GetCommand).resolves({ Item: { tombolaId: 't1', status, drawPoolMode, gridSize: 10 } });
}

describe('runDraw', () => {
  it('picks a confirmed number via CSPRNG, records an immutable audit, and finishes', async () => {
    withTombola('active');
    mock.on(QueryCommand).resolves({
      Items: [
        { number: 1, state: 'available' },
        { number: 2, state: 'confirmed', ownerUserId: 'u1', ownerName: 'Ahmad E.' },
      ],
    });
    mock.on(UpdateCommand).resolves({});
    mock.on(PutCommand).resolves({});

    const res = await runDraw('t1', 'admin1');
    expect(res.winningNumber).toBe(2);
    expect(res.winnerUserId).toBe('u1');
    expect(res.poolSize).toBe(1);

    const claim = mock.commandCalls(UpdateCommand)[0]!.args[0].input;
    expect(claim.ConditionExpression).toContain(':active');
    const audit = mock.commandCalls(PutCommand)[0]!.args[0].input.Item as Record<string, unknown>;
    expect(audit.SK).toBe('DRAW');
    expect(audit.rngSource).toBe('crypto.randomInt');
    expect(audit.poolSnapshot).toEqual([2]);
    expect(audit.winningNumber).toBe(2);
  });

  it('is idempotent: a finished tombola throws already_drawn', async () => {
    withTombola('finished');
    await expect(runDraw('t1', 'admin1')).rejects.toMatchObject({ code: 'already_drawn' });
  });

  it('throws already_drawn when the atomic claim loses the race', async () => {
    withTombola('active');
    mock.on(QueryCommand).resolves({ Items: [{ number: 2, state: 'confirmed', ownerUserId: 'u1' }] });
    mock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    await expect(runDraw('t1', 'admin1')).rejects.toBeInstanceOf(DrawError);
  });

  it('throws no_eligible when there are no confirmed numbers', async () => {
    withTombola('active');
    mock.on(QueryCommand).resolves({ Items: [{ number: 1, state: 'available' }] });
    await expect(runDraw('t1', 'admin1')).rejects.toMatchObject({ code: 'no_eligible' });
  });

  it('rejects a non-drawable status', async () => {
    withTombola('upcoming');
    await expect(runDraw('t1', 'admin1')).rejects.toMatchObject({ code: 'not_drawable' });
  });
});
