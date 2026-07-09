import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { createPayment, attachProof, markPaymentReviewed, expirePendingPayment } from './payments';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('payments repository', () => {
  it('createPayment writes a pending item with queue + user GSI keys', async () => {
    mock.on(PutCommand).resolves({});
    await createPayment({ paymentId: 'p1', tombolaId: 't1', numbers: [5], userId: 'u1', amount: 10, currency: 'USD' });
    const item = mock.commandCalls(PutCommand)[0]!.args[0].input.Item as Record<string, unknown>;
    expect(item.PK).toBe('PAYMENT#p1');
    expect(item.GSI1PK).toBe('PAYMENT#STATUS#pending');
    expect(item.GSI2PK).toBe('USER#u1');
    expect(item.status).toBe('pending');
  });

  it('markPaymentReviewed sets status and drops the queue keys', async () => {
    mock.on(UpdateCommand).resolves({});
    await markPaymentReviewed('p1', 'confirmed', 'admin1');
    const upd = mock.commandCalls(UpdateCommand)[0]!.args[0].input;
    expect(upd.UpdateExpression).toContain('REMOVE GSI1PK, GSI1SK');
  });

  it('attachProof returns false when the conditional write fails', async () => {
    mock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    expect(await attachProof('p1', 'u1', 'ref-123')).toBe(false);
  });

  it('expirePendingPayment ignores an already-reviewed payment', async () => {
    mock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    await expect(expirePendingPayment('p1')).resolves.toBeUndefined();
  });
});
