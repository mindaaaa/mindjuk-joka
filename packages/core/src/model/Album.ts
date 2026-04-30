import { z } from 'zod';

type AlbumType = z.infer<typeof Album.Schema>;

export class Album {
  static from(params: AlbumType): Album {
    Album.Schema.parse(params);

    return new Album(
      params.id,
      params.cid,
      params.name,
      params.description,
      params.isDeleted,
    );
  }

  static get Schema() {
    return z.object({
      id: z.number().positive(),
      cid: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1),
      isDeleted: z.boolean(),
    });
  }

  private constructor(
    public readonly id: number,
    public readonly cid: string,
    public readonly name: string,
    public readonly description: string,
    public readonly isDeleted: boolean,
  ) {}

  get data() {
    return { ...this };
  }
}
