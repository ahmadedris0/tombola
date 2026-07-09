import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserBySub, updateUserProfile } from '../repository/users';

type Event = {
  requestContext: { authorizer: { jwt: { claims: Record<string, string> } } };
  body?: string;
};

const json = (statusCode: number, data: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data),
});

const updateSchema = z.object({
  fullName: z.string().min(1),
  locale: z.enum(['en', 'ar']),
});

export const getMe = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const sub = event.requestContext.authorizer.jwt.claims.sub!;
  const user = await getUserBySub(sub);
  if (!user) return json(404, { error: 'not_found' });
  return json(200, {
    userId: user.userId,
    fullName: user.fullName,
    locale: user.locale,
    phoneE164: user.phoneE164,
    role: user.role,
  });
};

export const updateMe = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const sub = event.requestContext.authorizer.jwt.claims.sub!;
  const parsed = updateSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) return json(400, { error: 'invalid_body' });
  await updateUserProfile(sub, parsed.data.fullName, parsed.data.locale);
  return json(200, { ok: true });
};
