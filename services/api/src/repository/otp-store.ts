import { PutCommand, GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';

export type OtpPurpose = 'signup' | 'reset';
const OTP_TTL_SECONDS = 600;

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

function key(phoneE164: string, purpose: OtpPurpose) {
  return { PK: `OTP#${phoneE164}#${purpose}`, SK: 'OTP' };
}

export async function putOtp(phoneE164: string, purpose: OtpPurpose, code: string): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...key(phoneE164, purpose), code, ttl: nowEpoch() + OTP_TTL_SECONDS },
    }),
  );
}

export async function getOtp(phoneE164: string, purpose: OtpPurpose): Promise<string | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: key(phoneE164, purpose) }));
  const item = res.Item;
  if (!item) return null;
  // DynamoDB TTL deletion is lazy (up to 48h), so verify freshness explicitly.
  if (typeof item.ttl === 'number' && item.ttl < nowEpoch()) return null;
  return (item.code as string | undefined) ?? null;
}

export async function deleteOtp(phoneE164: string, purpose: OtpPurpose): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key(phoneE164, purpose) }));
}

/** Atomically increments the resend counter for a phone; returns the new count. */
export async function incrementResendCount(phoneE164: string, ttlSeconds: number): Promise<number> {
  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `OTPCAP#${phoneE164}`, SK: 'OTPCAP' },
      UpdateExpression: 'SET #c = if_not_exists(#c, :zero) + :one, #ttl = if_not_exists(#ttl, :ttl)',
      ExpressionAttributeNames: { '#c': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':ttl': nowEpoch() + ttlSeconds },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return Number(res.Attributes?.count ?? 0);
}
