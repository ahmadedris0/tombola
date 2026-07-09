import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { putNotification, listNotifications, setLastRead } from './notifications';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('notifications repository', () => {
  it('putNotification writes a per-user item with a TTL and type/params', async () => {
    mock.on(PutCommand).resolves({});
    await putNotification('u1', 'payment_confirmed', { numbers: [5] });
    const item = mock.commandCalls(PutCommand)[0]!.args[0].input.Item as Record<string, unknown>;
    expect(item.PK).toBe('USER#u1');
    expect(String(item.SK).startsWith('NOTIF#')).toBe(true);
    expect(item.type).toBe('payment_confirmed');
    expect(typeof item.ttl).toBe('number');
  });

  it('listNotifications queries newest-first and maps type/params/createdAt', async () => {
    mock.on(QueryCommand).resolves({
      Items: [{ type: 'draw_won', params: { winningNumber: 7 }, createdAt: '2026-07-09T12:00:00Z' }],
    });
    const out = await listNotifications('u1');
    expect(mock.commandCalls(QueryCommand)[0]!.args[0].input.ScanIndexForward).toBe(false);
    expect(out[0]!.type).toBe('draw_won');
  });

  it('setLastRead stamps notifLastReadAt on the user mirror', async () => {
    mock.on(UpdateCommand).resolves({});
    await setLastRead('u1');
    const upd = mock.commandCalls(UpdateCommand)[0]!.args[0].input;
    expect(upd.Key).toEqual({ PK: 'USER#u1', SK: 'USER#u1' });
    expect(upd.UpdateExpression).toContain('notifLastReadAt');
  });
});
