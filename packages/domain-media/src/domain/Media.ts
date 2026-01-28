import { Actioned } from '@joka/core/src/model/Actioned';
import { User } from '@joka/core/src/model/User';
import { Nullable } from '@joka/core/src/type';
import { z } from 'zod';

import { Content } from './Content';

interface ConstructorParameters {
  description: string;
  user: User;
}

const MediaState = {
  DRAFT: 'DRAFT',
  PREPARING: 'PREPARING',
  COMPLETE: 'COMPLETE',
} as const;

export class DraftMedia {
  public readonly state = MediaState.DRAFT;
  public readonly content = null;
  public readonly isFavorite = false;

  static from(params: ConstructorParameters): DraftMedia {
    const user = Actioned.from({ by: params.user });
    const draft = new DraftMedia(params.description, user, user);

    DraftMedia.Schema.parse(draft.data);

    return draft;
  }

  static get Schema() {
    return z.object({
      description: z.string().min(1),
      state: z.string().min(1),
      content: Content.Schema.nullable(),
      isFavorite: z.boolean(),
      created: Actioned.Schema,
    });
  }

  private constructor(
    public readonly description: string,
    public readonly created: Actioned,
    public readonly updated: Actioned,
  ) {}

  get data() {
    const draft = {
      ...this,
      created: {
        at: this.created.at,
        by: {
          ...this.created.by,
          email: this.created.by.email.value,
        },
      },
      updated: {
        at: this.updated.at,
        by: {
          ...this.updated.by,
          email: this.updated.by.email.value,
        },
      },
    };

    DraftMedia.Schema.parse(draft);

    return draft;
  }
}

type MediaType = z.infer<typeof Media.Schema>;

export class Media {
  static get State() {
    return MediaState;
  }

  static from(params: MediaType): Media {
    const instance = new Media(
      params.id,
      params.cid,
      params.description,
      params.state as keyof typeof Media.State,
      params.content as Nullable<Content>,
      params.isFavorite,
      Actioned.from({
        at: params.created.at,
        by: User.from(params.created.by),
      }),
      Actioned.from({
        at: params.updated.at,
        by: User.from(params.updated.by),
      }),
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
      updated: Actioned.Schema,
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
    public readonly updated: Actioned,
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
      this.updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  get isReadyToComplete(): boolean {
    return this.state === Media.State.DRAFT && !!this.content;
  }

  get data() {
    const media = {
      ...this,
      content: this.content ? this.content.data : null,
      created: {
        at: this.created.at,
        by: {
          ...this.created.by,
          email: this.created.by.email.value,
        },
      },
      updated: {
        at: this.updated.at,
        by: {
          ...this.updated.by,
          email: this.updated.by.email.value,
        },
      },
    };

    Media.Schema.parse(media);

    return media;
  }
}
