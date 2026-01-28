import { Actioned } from '@joka/core/src/model/Actioned';
import { User } from '@joka/core/src/model/User';
import { Nullable } from '@joka/core/src/type';
import { z } from 'zod';

import { Content } from './Content';

interface ConstructorParameters {
  id: number;
  cid: string;
  description: string;
  user: User;
}

const MediaState = {
  DRAFT: 'DRAFT',
  PREPARING: 'PREPARING',
  COMPLETE: 'COMPLETE',
} as const;

export class Media {
  static get State() {
    return MediaState;
  }

  static from(params: ConstructorParameters): Media {
    const { id, cid, description, user } = params;
    const created = Actioned.from({
      at: new Date(),
      by: user,
    });

    const instance = new Media(
      id,
      cid,
      description,
      Media.State.DRAFT,
      null,
      false,
      created,
    );

    Media.Schema.parse(instance.data);

    return instance;
  }

  static get Schema() {
    return z.object({
      id: z.number().positive(),
      cid: z.string().min(1),
      description: z.string().min(1),
      state: z.string().min(1),
      content: Content.Schema.nullable(),
      isFavorite: z.boolean(),
      created: Actioned.Schema,
    });
  }

  private constructor(
    public readonly id: number,
    public readonly cid: string,
    public readonly description: string,
    public readonly state: keyof typeof Media.State,
    public readonly content: Nullable<Content>,
    public readonly isFavorite: boolean,
    public readonly created: Actioned,
  ) {}

  setContent(content: Nullable<Content>): Media {
    // TODO: created는 깊은 복사하기
    const media = new Media(
      this.id,
      this.cid,
      this.description,
      this.state,
      content,
      this.isFavorite,
      this.created,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  get isReadyToComplete(): boolean {
    return this.state === Media.State.DRAFT && !!this.content;
  }

  get data() {
    const { at, by } = this.created;

    const media = {
      ...this,
      content: this.content ? this.content.data : null,
      created: {
        at,
        by: {
          ...by,
          email: by.email.value,
        },
      },
    };

    Media.Schema.parse(media);

    return media;
  }
}
