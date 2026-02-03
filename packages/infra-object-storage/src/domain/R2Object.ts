import { z } from 'zod';

type R2ObjectType = z.infer<typeof R2Object.Schema>;

export class R2Object {
  static from(params: R2ObjectType): R2Object {
    R2Object.Schema.parse(params);

    return new R2Object(
      params.key,
      params.eTag,
      params.size,
      params.contentType,
    );
  }

  static get Schema() {
    return z.object({
      key: z.string().min(1),
      eTag: z.string().min(1),
      size: z.number().positive(),
      contentType: z.string().min(1),
    });
  }

  private constructor(
    public readonly key: string,
    public readonly eTag: string,
    public readonly size: number,
    public readonly contentType: string,
  ) {}

  get data() {
    return { ...this };
  }
}
