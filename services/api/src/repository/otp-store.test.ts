import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { putStubOtp, getStubOtp, incrementResendCount } from './otp-store';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('otp-store', () => {
  it('putStubOtp writes an OTP item with a ttl', async () => {
    mock.on(PutCommand).resolves({});
    await putStubOtp('+96170123456', '123456');
    const item = mock.commandCalls(PutCommand)[0].args[0].input.Item as Record<string, unknown>;
    expect(item.PK).toBe('OTP#+96170123456');
    expect(item.code).toBe('123456');
    expect(typeof item.ttl).toBe('number');
  });

  it('getStubOtp returns the code or null', async () => {
    mock.on(GetCommand).resolves({ Item: { code: '123456' } });
    expect(await getStubOtp('+96170123456')).toBe('123456');
    mock.on(GetCommand).resolves({});
    expect(await getStubOtp('+96170123456')).toBeNull();
  });

  it('incrementResendCount returns the new count from the atomic update', async () => {
    mock.on(UpdateCommand).resolves({ Attributes: { count: 2 } });
    const count = await incrementResendCount('+96170123456', 1800);
    expect(count).toBe(2);
  });
});
