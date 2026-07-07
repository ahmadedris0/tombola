import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getStubOtp } from '../repository/otp-store';

type Event = { pathParameters?: { phone?: string } };

export const handler = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  if (process.env.OTP_DELIVERY === 'whatsapp') {
    return { statusCode: 404, body: JSON.stringify({ error: 'disabled' }) };
  }
  const phone = decodeURIComponent(event.pathParameters?.phone ?? '');
  const code = await getStubOtp(phone);
  if (!code) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  };
};
