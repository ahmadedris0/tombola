import { randomUUID } from 'node:crypto';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';

const NOTIF_TTL_SECONDS = 30 * 24 * 3600;

export interface NotificationView {
  type: string;
  params: Record<string, unknown>;
  createdAt: string;
}

export async function putNotification(
  userId: string,
  type: string,
  params: Record<string, unknown>,
): Promise<void> {
  const createdAt = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `NOTIF#${createdAt}#${randomUUID().slice(0, 8)}`,
        type,
        params,
        createdAt,
        ttl: Math.floor(Date.now() / 1000) + NOTIF_TTL_SECONDS,
      },
    }),
  );
}

export async function listNotifications(userId: string, limit = 50): Promise<NotificationView[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'NOTIF#' },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []).map((i) => ({
    type: i.type as string,
    params: (i.params ?? {}) as Record<string, unknown>,
    createdAt: i.createdAt as string,
  }));
}

export async function setLastRead(userId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `USER#${userId}` },
      UpdateExpression: 'SET notifLastReadAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
    }),
  );
}
