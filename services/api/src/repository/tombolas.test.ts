import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
  UpdateCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { createTombola, seedNumbers, softDeleteTombola } from './tombolas';
import type { CreateTombolaInput } from '@tombola/shared';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

const input: CreateTombolaInput = {
  title: { en: 'Cars', ar: 'سيارات' },
  gridSize: 100,
  pricePerNumber: 10,
  currency: 'USD',
  prizeAmount: 400,
  reservationWindowMinutes: 60,
  drawPoolMode: 'confirmed_only',
  status: 'active',
};

describe('tombola repository', () => {
  it('createTombola writes the metadata item with GSI1 listing keys and seeds numbers', async () => {
    mock.on(PutCommand).resolves({});
    mock.on(BatchWriteCommand).resolves({});
    const t = await createTombola(input, 'admin1');
    expect(t.tombolaId).toBeTruthy();
    const meta = mock.commandCalls(PutCommand)[0]!.args[0].input.Item as Record<string, string>;
    expect(meta.GSI1PK).toBe('TOMBOLA#STATUS#active');
    expect(meta.createdBy).toBe('admin1');
    // 100 numbers in batches of 25 = 4 BatchWrite calls
    expect(mock.commandCalls(BatchWriteCommand)).toHaveLength(4);
  });

  it('seedNumbers zero-pads the SK and defaults labels to the number', async () => {
    mock.on(BatchWriteCommand).resolves({});
    await seedNumbers('t1', 25);
    const req = mock.commandCalls(BatchWriteCommand)[0]!.args[0].input.RequestItems!;
    const first = Object.values(req)[0]![0]!.PutRequest!.Item as Record<string, unknown>;
    expect(first.SK).toBe('NUMBER#001');
    expect(first.labelEn).toBe('1');
  });

  it('softDeleteTombola stamps deletedAt and removes the GSI1 keys', async () => {
    mock.on(GetCommand).resolves({ Item: { tombolaId: 't1', status: 'active' } });
    mock.on(UpdateCommand).resolves({});
    const ok = await softDeleteTombola('t1');
    expect(ok).toBe(true);
    const upd = mock.commandCalls(UpdateCommand)[0]!.args[0].input;
    expect(upd.UpdateExpression).toContain('REMOVE GSI1PK, GSI1SK');
  });

  it('softDeleteTombola returns false when the tombola is missing', async () => {
    mock.on(GetCommand).resolves({});
    expect(await softDeleteTombola('ghost')).toBe(false);
  });
});
