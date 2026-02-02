import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Nullable } from '@joka/core/src/type';

import { ListMediaCondition } from '../domain/ListMediaCondition';
import { Media, DraftMedia } from '../domain/Media';
import { UpdateMediaRequest } from '../domain/UpdateMediaRequest';
import * as repository from '../infrastructure/persistence/media.repository';

interface Context {
  album: Album;
  user: User;
}

interface CreateRequest {
  description: string;
}
export const create = (
  context: Context,
  request: CreateRequest,
): Promise<Media> => {
  return repository.insert(
    DraftMedia.from({
      album: context.album,
      user: context.user,
      description: request.description,
    }),
  );
};

interface ListRequest {
  limit?: number;
  states?: string[];
  cursor?: string;
  sortOrder?: string;
}
interface ListResponse<E, P> {
  items: E[];
  pagination: { size: number } & P;
}
export const list = async (
  context: Context,
  request: ListRequest,
): Promise<
  ListResponse<
    Media,
    { order: string; nextCursor: Nullable<string>; hasNext: boolean }
  >
> => {
  const condition = ListMediaCondition.from({
    limit: request.limit,
    filter: { albumId: context.album.id, states: request.states || [] },
    cursor: request.cursor ? { cid: request.cursor } : null,
    sortOrder: request.sortOrder,
  });

  const { items, nextCursor } = await repository.findMany(condition);

  return {
    items,
    pagination: {
      size: condition.limit,
      order: condition.sortOrder,
      nextCursor: nextCursor ? nextCursor.cid : null,
      hasNext: !!nextCursor,
    },
  };
};

interface GetRequest {
  cid: string;
}
export const get = (context: Context, request: GetRequest): Promise<Media> => {
  return repository.findOne(context.album.id, request.cid);
};

export const update = async (
  context: Context,
  request: UpdateMediaRequest,
): Promise<Media> => {
  const found = await repository.findOne(context.album.id, request.cid);

  const desired = found.updateBy(request);

  return repository.update(desired);
};

interface DeleteRequest {
  cid: string;
}
export const remove = async (
  context: Context,
  request: DeleteRequest,
): Promise<null> => {
  const target = await repository.findOne(context.album.id, request.cid);

  return repository.deleteOne(target);
};
