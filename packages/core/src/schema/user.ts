import { z } from 'zod';

import { emailSchema } from './email';

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: emailSchema,
});

export type UserInput = z.infer<typeof userSchema>;
