import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { putUserMirror, getUserBySub } from './users';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('users repository', () => {
  it('putUserMirror writes a USER item with phone GSI keys', async () => {
    mock.on(PutCommand).resolves({});
    await putUserMirror({
      sub: 'u1',
      phoneE164: '+96170123456',
      fullName: 'Ahmad E',
      locale: 'en',
      role: 'user',
    });
    const call = mock.commandCalls(PutCommand)[0];
    expect(call.args[0].input.Item).toMatchObject({
      PK: 'USER#u1',
      SK: 'USER#u1',
      GSI1PK: 'USER#PHONE#+96170123456',
      GSI1SK: 'USER',
      fullName: 'Ahmad E',
      locale: 'en',
      role: 'user',
      phoneVerified: true,
    });
  });

  it('getUserBySub returns the item or null', async () => {
    mock.on(GetCommand).resolves({ Item: { PK: 'USER#u1', fullName: 'Ahmad E' } });
    const found = await getUserBySub('u1');
    expect(found?.fullName).toBe('Ahmad E');
    mock.on(GetCommand).resolves({});
    expect(await getUserBySub('nope')).toBeNull();
  });
});
