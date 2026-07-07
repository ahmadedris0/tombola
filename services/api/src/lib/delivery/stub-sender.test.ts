import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../dynamo';
import { StubSender } from './stub-sender';

const mock = mockClient(ddb as unknown as DynamoDBDocumentClient);
beforeEach(() => mock.reset());

describe('StubSender', () => {
  it('stores the code so the dev endpoint can retrieve it', async () => {
    mock.on(PutCommand).resolves({});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new StubSender().send({ phoneE164: '+96170123456', code: '123456', locale: 'en' });
    expect(mock.commandCalls(PutCommand)).toHaveLength(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
