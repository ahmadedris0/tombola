import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const handler = async (): Promise<APIGatewayProxyStructuredResultV2> => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ status: 'ok', stage: process.env.STAGE ?? 'unknown' }),
});
