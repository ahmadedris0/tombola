import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';

const STUB_TTL_SECONDS = 600;

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

export async function putStubOtp(phoneE164: string, code: string): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `OTP#${phoneE164}`,
        SK: 'OTP',
        code,
        ttl: nowEpoch() + STUB_TTL_SECONDS,
      },
    }),
  );
}

export async function getStubOtp(phoneE164: string): Promise<string | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: `OTP#${phoneE164}`, SK: 'OTP' } }),
  );
  return (res.Item?.code as string | undefined) ?? null;
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
