import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { json, claimSub, type AuthedEvent } from '../lib/http';
import { listNotifications, setLastRead } from '../repository/notifications';
import { getUserBySub } from '../repository/users';

export const mine = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const userId = claimSub(event);
  const [notifications, user] = await Promise.all([listNotifications(userId), getUserBySub(userId)]);
  return json(200, { notifications, lastReadAt: (user?.notifLastReadAt as string | undefined) ?? null });
};

export const read = async (event: AuthedEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  await setLastRead(claimSub(event));
  return json(200, { ok: true });
};
