import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/dynamo';

export interface UserMirror {
  sub: string;
  phoneE164: string;
  fullName: string;
  locale: 'en' | 'ar';
  role: 'user' | 'admin';
}

export async function putUserMirror(u: UserMirror): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${u.sub}`,
        SK: `USER#${u.sub}`,
        GSI1PK: `USER#PHONE#${u.phoneE164}`,
        GSI1SK: 'USER',
        userId: u.sub,
        phoneE164: u.phoneE164,
        fullName: u.fullName,
        locale: u.locale,
        role: u.role,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
      },
    }),
  );
}

export async function getUserBySub(sub: string): Promise<Record<string, unknown> | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${sub}`, SK: `USER#${sub}` } }),
  );
  return res.Item ?? null;
}

export async function updateUserProfile(
  sub: string,
  fullName: string,
  locale: 'en' | 'ar',
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${sub}`, SK: `USER#${sub}` },
      UpdateExpression: 'SET fullName = :n, locale = :l',
      ExpressionAttributeValues: { ':n': fullName, ':l': locale },
    }),
  );
}
