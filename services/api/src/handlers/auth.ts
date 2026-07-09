import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { isValidE164 } from '@tombola/auth/phone';
import { putOtp, getOtp, deleteOtp, incrementResendCount } from '../repository/otp-store';
import { putUserMirror } from '../repository/users';
import { getDeliveryProvider } from '../lib/delivery/index';
import {
  cognitoSignUp,
  cognitoConfirm,
  cognitoGetUser,
  cognitoSetPassword,
} from '../lib/cognito-admin';

const RESEND_WINDOW_SECONDS = 1800;
const RESEND_MAX = 3;

type Event = { body?: string };

const json = (statusCode: number, data: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data),
});
const fail = (statusCode: number, code: string) => json(statusCode, { error: code });

function genOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function parse<T>(schema: z.ZodType<T>, event: Event): T | null {
  try {
    const result = schema.safeParse(JSON.parse(event.body ?? '{}'));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

const registerSchema = z.object({
  fullName: z.string().min(1),
  phoneE164: z.string(),
  password: z.string().min(8),
  locale: z.enum(['en', 'ar']),
});

export const register = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const data = parse(registerSchema, event);
  if (!data || !isValidE164(data.phoneE164)) return fail(400, 'InvalidParameterException');
  try {
    await cognitoSignUp(data.phoneE164, data.password, data.fullName, data.locale);
  } catch (e) {
    return fail(400, (e as { name?: string }).name ?? 'GenericError');
  }
  const code = genOtp();
  await putOtp(data.phoneE164, 'signup', code);
  await incrementResendCount(data.phoneE164, RESEND_WINDOW_SECONDS);
  await getDeliveryProvider(process.env).send({ phoneE164: data.phoneE164, code, locale: data.locale });
  return json(200, { ok: true });
};

const phoneSchema = z.object({ phoneE164: z.string() });
const verifySchema = z.object({ phoneE164: z.string(), code: z.string() });

export const verify = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const data = parse(verifySchema, event);
  if (!data) return fail(400, 'InvalidParameterException');
  const stored = await getOtp(data.phoneE164, 'signup');
  if (!stored) return fail(400, 'ExpiredCodeException');
  if (stored !== data.code) return fail(400, 'CodeMismatchException');
  await cognitoConfirm(data.phoneE164);
  const user = await cognitoGetUser(data.phoneE164);
  await putUserMirror({
    sub: user.sub,
    phoneE164: data.phoneE164,
    fullName: user.name,
    locale: user.locale,
    role: 'user',
  });
  await deleteOtp(data.phoneE164, 'signup');
  return json(200, { ok: true });
};

export const resend = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const data = parse(phoneSchema, event);
  if (!data) return fail(400, 'InvalidParameterException');
  const count = await incrementResendCount(data.phoneE164, RESEND_WINDOW_SECONDS);
  if (count > RESEND_MAX) return fail(429, 'LimitExceededException');
  let locale: 'en' | 'ar' = 'en';
  try {
    locale = (await cognitoGetUser(data.phoneE164)).locale;
  } catch {
    return fail(404, 'UserNotFoundException');
  }
  const code = genOtp();
  await putOtp(data.phoneE164, 'signup', code);
  await getDeliveryProvider(process.env).send({ phoneE164: data.phoneE164, code, locale });
  return json(200, { ok: true });
};

export const forgot = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const data = parse(phoneSchema, event);
  if (!data) return fail(400, 'InvalidParameterException');
  const count = await incrementResendCount(data.phoneE164, RESEND_WINDOW_SECONDS);
  if (count > RESEND_MAX) return fail(429, 'LimitExceededException');
  let locale: 'en' | 'ar';
  try {
    locale = (await cognitoGetUser(data.phoneE164)).locale;
  } catch {
    // Do not leak whether the account exists.
    return json(200, { ok: true });
  }
  const code = genOtp();
  await putOtp(data.phoneE164, 'reset', code);
  await getDeliveryProvider(process.env).send({ phoneE164: data.phoneE164, code, locale });
  return json(200, { ok: true });
};

const resetSchema = z.object({
  phoneE164: z.string(),
  code: z.string(),
  newPassword: z.string().min(8),
});

export const reset = async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
  const data = parse(resetSchema, event);
  if (!data) return fail(400, 'InvalidParameterException');
  const stored = await getOtp(data.phoneE164, 'reset');
  if (!stored) return fail(400, 'ExpiredCodeException');
  if (stored !== data.code) return fail(400, 'CodeMismatchException');
  try {
    await cognitoSetPassword(data.phoneE164, data.newPassword);
  } catch (e) {
    return fail(400, (e as { name?: string }).name ?? 'GenericError');
  }
  await deleteOtp(data.phoneE164, 'reset');
  return json(200, { ok: true });
};
