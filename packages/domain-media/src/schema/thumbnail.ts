import { urlSchema } from '@joka/core/src/schema';
import { z } from 'zod';

import { mimeTypeSchema } from './mime-type';

export const thumbnailCreateSchema = z.object({
  url: urlSchema,
  size: z.number().positive(),
  eTag: z.string(),
  mimeType: mimeTypeSchema,
  blurhash: z.string(),
});

export type ThumbnailCreateInput = z.infer<typeof thumbnailCreateSchema>;
