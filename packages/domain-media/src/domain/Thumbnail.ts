import { Url } from '@joka/core/src/model/Url';
import { MimeType } from '@joka/lib-mime/src/domain/MimeType';
import { z } from 'zod';

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

  get data() {
    const mimeType = {
      ...this,
      url: this.url.fullPath,
      mimeType: this.mimeType.value,
    };

    Thumbnail.Schema.parse(mimeType);

    return mimeType;
  }
}

export type ThumbnailType = z.infer<typeof Thumbnail.Schema>;
