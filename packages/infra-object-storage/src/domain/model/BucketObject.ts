import { MimeType } from '@joka/lib-mime/src/domain/MimeType';
import { z } from 'zod';

type BucketObjectType = z.infer<typeof BucketObject.Schema>;

export class BucketObject {
  static from(params: BucketObjectType): BucketObject {
    BucketObject.Schema.parse(params);

    return new BucketObject(
      params.bucket,
      params.key,
      params.eTag,
      params.size,
      MimeType.from(params.contentType),
    );
  }

  static get Schema() {
    return z.object({
      bucket: z.string().min(1),
      key: z.string().min(1),
      eTag: z.string().min(1),
      size: z.number().positive(),
      contentType: MimeType.Schema,
    });
  }

  private constructor(
    public readonly bucket: string,
    public readonly key: string,
    public readonly eTag: string,
    public readonly size: number,
    public readonly contentType: MimeType,
  ) {}

  get data() {
    return { ...this };
  }
}
