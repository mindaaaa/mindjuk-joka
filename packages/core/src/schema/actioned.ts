import { z } from 'zod';

import { Email } from '../model/Email';

export const actionedBySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: Email.Schema,
});

export const actionedSchema = z.object({
  at: z.date(),
  by: actionedBySchema,
});

export type ActionedByInput = z.infer<typeof actionedBySchema>;
export type ActionedInput = z.infer<typeof actionedSchema>;
