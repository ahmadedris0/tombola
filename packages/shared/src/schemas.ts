import { z } from 'zod';

export const localeSchema = z.enum(['en', 'ar']);
export const localizedTextSchema = z.object({ en: z.string(), ar: z.string() });

export const tombolaStatusSchema = z.enum([
  'draft',
  'upcoming',
  'active',
  'closed',
  'finished',
  'cancelled',
]);
export const numberStateSchema = z.enum(['available', 'reserved', 'confirmed']);
export const paymentStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);

export const userSchema = z.object({
  userId: z.string(),
  fullName: z.string().min(1),
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  locale: localeSchema,
  role: z.enum(['user', 'admin']),
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
