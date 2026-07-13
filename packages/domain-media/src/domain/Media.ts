import {
  ConflictException,
  IllegalStateException,
  InvalidArgumentException,
} from '@joka/core/src/exception';
import { Actioned } from '@joka/core/src/model/Actioned';
import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Nullable } from '@joka/core/src/type';
import { z } from 'zod';

import { Content } from './Content';
import { Thumbnail } from './Thumbnail';
import { UpdateMediaRequest } from './UpdateMediaRequest';

interface ConstructorParameters {
  album: Album;
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
    const draft = new DraftMedia(
      params.album.id,
      params.description,
      user,
      user,
    );

    DraftMedia.Schema.parse(draft.data);

    return draft;
  }

  static get Schema() {
    return z.object({
      albumId: z.number().positive(),
      description: z.string().min(1),
      state: z.string().min(1),
      content: Content.Schema.nullable(),
      isFavorite: z.boolean(),
      created: Actioned.Schema,
    });
  }

  private constructor(
    public readonly albumId: number,
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
    const thumbnail = params.content?.thumbnail
      ? Thumbnail.from(params.content.thumbnail)
      : null;
    const content = params.content
      ? Content.from({ ...params.content, thumbnail })
      : null;

    const instance = new Media(
      params.id,
      params.cid,
      params.albumId,
      params.description,
      params.state as keyof typeof Media.State,
      params.version,
      content,
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
      albumId: z.number().positive(),
      description: z.string().min(1),
      state: z.string().min(1),
      version: z.int().positive(),
      content: Content.Schema.nullable(),
      isFavorite: z.boolean(),
      created: Actioned.Schema,
      updated: Actioned.Schema,
    });
  }

  private constructor(
    public readonly id: number,
    public readonly cid: string,
    public readonly albumId: number,
    public readonly description: string,
    public readonly state: keyof typeof Media.State,
    public readonly version: number,
    public readonly content: Nullable<Content>,
    public readonly isFavorite: boolean,
    public readonly created: Actioned,
    public readonly updated: Actioned,
  ) {
    // TODO: 이거 zod한테 맡길 수 있어보임
    if (this.created.by.id !== this.updated.by.id) {
      throw new IllegalStateException('ACTIONED_USER_MISMATCHED', [
        `Media를 생성한 사람과 수정한 사람은 다를 수 없습니다.`,
      ]);
    }
  }

  setVersion(version: number): Media {
    // TODO: created는 깊은 복사하기
    const media = new Media(
      this.id,
      this.cid,
      this.albumId,
      this.description,
      this.state,
      version,
      this.content,
      this.isFavorite,
      this.created,
      this.updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  setContent(content: Nullable<Content>): Media {
    // TODO: created는 깊은 복사하기
    const media = new Media(
      this.id,
      this.cid,
      this.albumId,
      this.description,
      this.state,
      this.version,
      content,
      this.isFavorite,
      this.created,
      this.updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  setUpdated(updated: Actioned): Media {
    // TODO: created는 깊은 복사하기
    const media = new Media(
      this.id,
      this.cid,
      this.albumId,
      this.description,
      this.state,
      this.version,
      this.content,
      this.isFavorite,
      this.created,
      updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  // TODO: 모든 요청이 현재 상태와 같다면 예외 던지기
  updateBy(request: UpdateMediaRequest): Media {
    if (this.cid !== request.cid) {
      throw new ConflictException(`MEDIA_CID_MISMATCHED`, [
        `Media(${this.cid})에 대한 수정 요청이 아닙니다.`,
      ]);
    }

    // TODO: 상태 전이 검증하기
    const order = [
      Media.State.DRAFT,
      Media.State.PREPARING,
      Media.State.COMPLETE,
    ];
    if (
      request.state &&
      order.indexOf(request.state) <= order.indexOf(this.state)
    ) {
      throw new ConflictException(`INVALID_STATE_TRANSITION`, [
        `${this.state}에서 ${request.state} 상태로 전이할 수 없습니다.`,
      ]);
    }

    const desiredContent = request.shouldUpdateContent
      ? request.content
      : this.content;

    const media = new Media(
      this.id,
      this.cid,
      this.albumId,
      request.description || this.description,
      request.state || this.state,
      this.version,
      desiredContent,
      this.isFavorite,
      this.created,
      this.updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  markAsFavorite(): Media {
    if (this.state !== Media.State.COMPLETE) {
      throw new InvalidArgumentException('MEDIA_NOT_COMPLETED', [
        `COMPLETE 상태의 Media만 즐겨찾기할 수 있습니다.`,
      ]);
    }

    const media = new Media(
      this.id,
      this.cid,
      this.albumId,
      this.description,
      this.state,
      this.version,
      this.content,
      true,
      this.created,
      this.updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  unmarkAsFavorite(): Media {
    if (this.state !== Media.State.COMPLETE) {
      throw new InvalidArgumentException('MEDIA_NOT_COMPLETED', [
        `COMPLETE 상태의 Media만 즐겨찾기 해제할 수 있습니다.`,
      ]);
    }

    const media = new Media(
      this.id,
      this.cid,
      this.albumId,
      this.description,
      this.state,
      this.version,
      this.content,
      false,
      this.created,
      this.updated,
    );

    Media.Schema.parse(media.data);

    return media;
  }

  isOwnedBy(user: User): boolean {
    return this.created.by.id === user.id;
  }

  isNotOwnedBy(user: User): boolean {
    return !this.isOwnedBy(user);
  }

  get isReadyToPrepare(): boolean {
    return this.state === Media.State.DRAFT && !this.content;
  }

  get isNotReadyToPrepare(): boolean {
    return !this.isReadyToPrepare;
  }

  get isReadyToComplete(): boolean {
    return this.state === Media.State.PREPARING && !!this.content;
  }

  get isNotReadyToComplete(): boolean {
    return !this.isReadyToComplete;
  }

  get hasNoContent(): boolean {
    return !this.content;
  }

  get hasContent(): boolean {
    return !this.hasNoContent;
  }

  get hasNoThumbnail(): boolean {
    return !this.content?.thumbnail;
  }

  get hasThumbnail(): boolean {
    return !this.hasNoThumbnail;
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
