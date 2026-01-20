import { Url } from '@joka/core/src/model/Url';
import { z } from 'zod';

import { MimeType } from './MimeType';

interface ConstructorParameters {
  url: string;
  size: number;
  eTag: string;
  mimeType: string;
  blurhash: string;
}

export class Thumbnail {
  static from(params: ConstructorParameters): Thumbnail {
    return new Thumbnail(
      Url.from(params.url),
      params.size,
      params.eTag,
      MimeType.from(params.mimeType),
      params.blurhash,
    );
  }

  static get Schema() {
    return z.object({
      url: Url.Schema,
      size: z.number().positive(),
      eTag: z.string(),
      mimeType: MimeType.Schema,
      blurhash: z.string(),
    });
  }

  private constructor(
    public readonly url: Url,
    public readonly size: number,
    public readonly eTag: string,
    public readonly mimeType: MimeType,
    public readonly blurhash: string,
  ) {}
}

export type ThumbnailCreateInput = z.infer<typeof Thumbnail.Schema>;
