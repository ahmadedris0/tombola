import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';

function key(paymentId: string) {
  return { PK: `PAYMENT#${paymentId}`, SK: `PAYMENT#${paymentId}` };
}

function toPayment(i: Record<string, unknown>) {
  return {
    paymentId: i.paymentId,
    tombolaId: i.tombolaId,
    numbers: i.numbers,
    userId: i.userId,
    amount: i.amount,
    currency: i.currency,
    status: i.status,
    whishReference: i.whishReference,
    reviewedByAdminId: i.reviewedByAdminId,
    reviewedAt: i.reviewedAt,
    createdAt: i.createdAt,
  };
}

export async function createPayment(p: {
  paymentId: string;
  tombolaId: string;
  numbers: number[];
  userId: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const createdAt = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...key(p.paymentId),
        GSI1PK: 'PAYMENT#STATUS#pending',
        GSI1SK: `${createdAt}#${p.paymentId}`,
        GSI2PK: `USER#${p.userId}`,
        GSI2SK: `PAYMENT#${createdAt}`,
        paymentId: p.paymentId,
        tombolaId: p.tombolaId,
        numbers: p.numbers,
        userId: p.userId,
        amount: p.amount,
        currency: p.currency,
        status: 'pending',
        createdAt,
      },
    }),
  );
}

export async function getPayment(paymentId: string): Promise<Record<string, unknown> | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: key(paymentId) }));
  return res.Item ?? null;
}

export async function listPendingPayments(): Promise<Record<string, unknown>[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'PAYMENT#STATUS#pending' },
    }),
  );
  return (res.Items ?? []).map(toPayment);
}

export async function listUserPayments(userId: string): Promise<Record<string, unknown>[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'PAYMENT#' },
    }),
  );
  return (res.Items ?? []).map(toPayment);
}

/** Attaches a Whish reference to the caller's own pending payment. Returns false if not allowed. */
export async function attachProof(
  paymentId: string,
  userId: string,
  whishReference: string,
): Promise<boolean> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: key(paymentId),
        ConditionExpression: 'userId = :uid AND #s = :pending',
        UpdateExpression: 'SET whishReference = :ref',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':uid': userId, ':pending': 'pending', ':ref': whishReference },
      }),
    );
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

/** Marks a pending payment confirmed/rejected and drops it from the admin queue (GSI1). */
export async function markPaymentReviewed(
  paymentId: string,
  status: 'confirmed' | 'rejected',
  adminId: string,
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: key(paymentId),
      UpdateExpression:
        'SET #s = :status, reviewedByAdminId = :admin, reviewedAt = :now REMOVE GSI1PK, GSI1SK',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': status, ':admin': adminId, ':now': new Date().toISOString() },
    }),
  );
}

/** Sweep helper: moves a still-pending payment to expired and out of the queue. */
export async function expirePendingPayment(paymentId: string): Promise<void> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: key(paymentId),
        ConditionExpression: '#s = :pending',
        UpdateExpression: 'SET #s = :expired REMOVE GSI1PK, GSI1SK',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':pending': 'pending', ':expired': 'expired' },
      }),
    );
  } catch (e) {
    if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
  }
}
