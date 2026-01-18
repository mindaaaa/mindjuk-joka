import { z } from 'zod';

export const emailSchema = z.email();

export type EmailInput = z.infer<typeof emailSchema>;
