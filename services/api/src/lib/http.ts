import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export type AuthedEvent = {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  pathParameters?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  body?: string;
};

export const json = (statusCode: number, data: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data),
});

export function claimSub(event: AuthedEvent): string {
  return String(event.requestContext?.authorizer?.jwt?.claims?.sub ?? '');
}

export function claimName(event: AuthedEvent): string {
  return String(event.requestContext?.authorizer?.jwt?.claims?.name ?? '');
}

/** Cognito groups arrive either as an array or an HTTP-API-stringified `[admin ...]`. */
export function getGroups(event: AuthedEvent): string[] {
  const raw = event.requestContext?.authorizer?.jwt?.claims?.['cognito:groups'];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return String(raw)
    .replace(/^\[|\]$/g, '')
    .split(/[,\s]+/)
    .filter(Boolean);
}

export function isAdmin(event: AuthedEvent): boolean {
  return getGroups(event).includes('admin');
}

export function parseBody<T = unknown>(event: AuthedEvent): T {
  try {
    return JSON.parse(event.body ?? '{}') as T;
  } catch {
    return {} as T;
  }
}
