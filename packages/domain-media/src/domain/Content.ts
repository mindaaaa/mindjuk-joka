import { Url } from '@joka/core/src/model/Url';
import { Nullable } from '@joka/core/src/type';
import { z } from 'zod';

import { MimeType } from './MimeType';
import { Thumbnail } from './Thumbnail';

interface ConstructorParameters {
  url: string;
  size: number;
  eTag: string;
  mimeType: string;
  thumbnail: Nullable<Thumbnail>;
}

export class Content {
  static from(params: ConstructorParameters): Content {
    return new Content(
      Url.from(params.url),
      params.size,
      params.eTag,
      MimeType.from(params.mimeType),
      params.thumbnail,
    );
  }

  static get Schema() {
    return z.object({
      url: Url.Schema,
      size: z.number().positive(),
      eTag: z.string(),
      mimeType: MimeType.Schema,
      thumbnail: Thumbnail.Schema.nullable(),
    });
  }

  private constructor(
    public readonly url: Url,
    public readonly size: number,
    public readonly eTag: string,
    public readonly mimeType: MimeType,
    public readonly thumbnail: Nullable<Thumbnail>,
  ) {}

  // TODO: Content가 Thumbnail을 만들 수 있도록 하기
}

export type ContentCreateInput = z.infer<typeof Content.Schema>;
