import { z } from 'zod';
import { localizedTextSchema } from './schemas';

/** Fields an admin supplies to create a tombola. Numbers are seeded from gridSize. */
export const createTombolaInputSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema.optional(),
  gridSize: z.number().int().positive().max(1000).default(100),
  pricePerNumber: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  prizeAmount: z.number().nonnegative(),
  prizeDescription: localizedTextSchema.optional(),
  whishNumberOverride: z.string().optional(),
  reservationWindowMinutes: z.number().int().positive().default(60),
  drawPoolMode: z.enum(['confirmed_only', 'full_grid']).default('confirmed_only'),
  openAt: z.string().datetime().optional(),
  drawAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'upcoming', 'active', 'closed', 'finished', 'cancelled']).default('draft'),
});

export type CreateTombolaInput = z.infer<typeof createTombolaInputSchema>;

/** Editable fields. gridSize is immutable after creation (numbers are already seeded). */
export const updateTombolaInputSchema = createTombolaInputSchema
  .omit({ gridSize: true })
  .partial();

export type UpdateTombolaInput = z.infer<typeof updateTombolaInputSchema>;

export const updateNumberLabelSchema = z.object({
  labelEn: z.string(),
  labelAr: z.string(),
});
