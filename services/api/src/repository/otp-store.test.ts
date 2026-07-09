import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { putOtp, getOtp, incrementResendCount } from './otp-store';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('otp-store', () => {
  it('putOtp writes a purpose-scoped OTP item with a ttl', async () => {
    mock.on(PutCommand).resolves({});
    await putOtp('+96170123456', 'signup', '123456');
    const item = mock.commandCalls(PutCommand)[0]!.args[0].input.Item as Record<string, unknown>;
    expect(item.PK).toBe('OTP#+96170123456#signup');
    expect(item.code).toBe('123456');
    expect(typeof item.ttl).toBe('number');
  });

  it('getOtp returns the code, or null when missing or expired', async () => {
    const future = Math.floor(Date.now() / 1000) + 100;
    mock.on(GetCommand).resolves({ Item: { code: '123456', ttl: future } });
    expect(await getOtp('+96170123456', 'signup')).toBe('123456');
    mock.on(GetCommand).resolves({});
    expect(await getOtp('+96170123456', 'signup')).toBeNull();
    mock.on(GetCommand).resolves({ Item: { code: 'old', ttl: 1 } });
    expect(await getOtp('+96170123456', 'signup')).toBeNull();
  });

  it('incrementResendCount returns the new count from the atomic update', async () => {
    mock.on(UpdateCommand).resolves({ Attributes: { count: 2 } });
    expect(await incrementResendCount('+96170123456', 1800)).toBe(2);
  });
});
