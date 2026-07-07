import { z } from 'zod';
import { TombolaStatus, NumberState, PaymentStatus, Role, Locale } from './enums';

const enumValues = <T extends string>(obj: Record<string, T>): [T, ...T[]] =>
  Object.values(obj) as [T, ...T[]];

export const localeSchema = z.enum(enumValues(Locale));
export const localizedTextSchema = z.object({ en: z.string(), ar: z.string() });

export const tombolaStatusSchema = z.enum(enumValues(TombolaStatus));
export const numberStateSchema = z.enum(enumValues(NumberState));
export const paymentStatusSchema = z.enum(enumValues(PaymentStatus));
export const roleSchema = z.enum(enumValues(Role));

export const userSchema = z.object({
  userId: z.string(),
  fullName: z.string().min(1),
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  locale: localeSchema,
  role: roleSchema,
  status: z.enum(['active', 'disabled']),
  phoneVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export const tombolaSchema = z.object({
  tombolaId: z.string(),
  title: localizedTextSchema,
  description: localizedTextSchema.optional(),
  status: tombolaStatusSchema,
  gridSize: z.number().int().positive(),
  pricePerNumber: z.number().nonnegative(),
  currency: z.string().length(3),
  prizeAmount: z.number().nonnegative(),
  prizeDescription: localizedTextSchema.optional(),
  whishNumberOverride: z.string().optional(),
  reservationWindowMinutes: z.number().int().positive(),
  drawPoolMode: z.enum(['confirmed_only', 'full_grid']),
  openAt: z.string().datetime().optional(),
  drawAt: z.string().datetime().optional(),
  winningNumber: z.number().int().optional(),
  winnerUserId: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});
