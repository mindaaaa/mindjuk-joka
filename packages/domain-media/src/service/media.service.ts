import { ForbiddenException } from '@joka/core/src/exception';
import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';

import {
  ListMediaCondition,
  ListMediaPagination,
} from '../domain/ListMediaCondition';
import { Media, DraftMedia } from '../domain/Media';
import { UpdateMediaRequest } from '../domain/UpdateMediaRequest';
import { MediaRepository } from '../infrastructure/persistence/media.repository';

interface Context {
  album: Album;
  user: User;
}
interface CreateRequest {
  description: string;
}
interface ListRequest {
  limit?: number;
  states?: string[];
  cursor?: string;
  sortOrder?: string;
}
interface ListResponse<E> {
  items: E[];
  pagination: ListMediaPagination;
}
interface GetRequest {
  cid: string;
}
interface DeleteRequest {
  cid: string;
  isForced: boolean;
}

export class MediaService {
  constructor(private repository: MediaRepository) {}

  create(context: Context, request: CreateRequest): Promise<Media> {
    return this.repository.insert(
      DraftMedia.from({
        album: context.album,
        user: context.user,
        description: request.description,
      }),
    );
  }

  async list(
    context: Context,
    request: ListRequest,
  ): Promise<ListResponse<Media>> {
    const condition = ListMediaCondition.from({
      limit: request.limit,
      filter: { albumId: context.album.id, states: request.states || [] },
      cursor: request.cursor ? { cid: request.cursor } : null,
      sortOrder: request.sortOrder,
    });

    const { items, nextCursor } = await this.repository.findMany(condition);

    return {
      items,
      pagination: {
        size: condition.limit,
        order: condition.sortOrder,
        nextCursor: nextCursor ? nextCursor.cid : null,
        hasNext: !!nextCursor,
      },
    };
  }

  get(context: Context, request: GetRequest): Promise<Media> {
    return this.repository.findOne(context.album.id, request.cid);
  }

  async update(context: Context, request: UpdateMediaRequest): Promise<Media> {
    const found = await this.repository.findOne(context.album.id, request.cid);
    if (found.isOwnedBy(context.user) || request.isForced) {
      return this.repository.update(found.updateBy(request));
    }

    throw new ForbiddenException(`OWNER_MISMATCHED`, [
      `Media(${request.cid})를 수정할 수 없습니다.`,
      `Media는 소유자만 수정할 수 있습니다.`,
    ]);
  }

  async delete(context: Context, request: DeleteRequest): Promise<null> {
    const target = await this.repository.findOne(context.album.id, request.cid);
    if (target.isOwnedBy(context.user) || request.isForced) {
      return this.repository.deleteOne(target);
    }

    throw new ForbiddenException(`OWNER_MISMATCHED`, [
      `Media(${request.cid})를 삭제할 수 없습니다.`,
      `Media는 소유자만 삭제할 수 있습니다.`,
    ]);
  }
}
