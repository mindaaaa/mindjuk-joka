import { userSchema } from '@joka/core/src/schema';
import { z } from 'zod';

export const mediaCreateSchema = z.object({
  id: z.number(),
  description: z.string().min(1),
  user: userSchema,
});

export type MediaCreateInput = z.infer<typeof mediaCreateSchema>;
