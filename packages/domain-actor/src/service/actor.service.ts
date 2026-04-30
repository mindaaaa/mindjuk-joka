import { User } from '@joka/core/src/model/User';

import { Actor } from '../domain/Actor';
import {
  ListActorsCondition,
  ListAlbumsPagination,
} from '../domain/ListActorsCondition';
import { ActorRepository } from '../infrastructure/persistence/actor.repository';

// TODO: 중복 제거
interface Context {
  albumCid: string;
  user: User;
}
interface ListRequest {
  limit?: number;
  cursor?: string;
  sortOrder?: string;
}
interface ListResponse<E> {
  items: E[];
  pagination: ListAlbumsPagination;
}

export class ActorService {
  constructor(private repository: ActorRepository) {}

  async findOneOrNull(context: Context): Promise<Actor | null> {
    return this.repository.findOneOrNull(context.user.cid, context.albumCid);
  }

  async list(user: User, request: ListRequest): Promise<ListResponse<Actor>> {
    const condition = ListActorsCondition.from({
      limit: request.limit,
      filter: { userId: user.id },
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
}
