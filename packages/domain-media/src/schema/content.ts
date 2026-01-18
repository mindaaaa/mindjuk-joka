import { urlSchema } from '@joka/core/src/schema';
import { z } from 'zod';

import { mimeTypeSchema } from './mime-type';
import { thumbnailCreateSchema } from './thumbnail';

export const contentCreateSchema = z.object({
  url: urlSchema,
  size: z.number().positive(),
  eTag: z.string(),
  mimeType: mimeTypeSchema,
  thumbnail: thumbnailCreateSchema.nullable(),
});

export type ContentCreateInput = z.infer<typeof contentCreateSchema>;
