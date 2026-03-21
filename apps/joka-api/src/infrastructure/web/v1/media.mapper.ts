import { Nullable } from '@joka/core/src/type';
import type { ContentType } from '@joka/domain-media/src/domain/Content';
import type { ListMediaPagination } from '@joka/domain-media/src/domain/ListMediaCondition';
import type { Media } from '@joka/domain-media/src/domain/Media';
import type {
  Media as ApiMedia,
  Content as ApiContent,
  Location as ApiLocation,
  Actioned as ApiActioned,
  User as ApiUser,
  ListMediaResponses,
} from '@joka/lib-openapi/src/generated/type/types.gen';

type ApiPagination = ListMediaResponses[200]['pagination'];

const toUserResponse = (user: {
  cid: string;
  name: string;
  email: string;
}): ApiUser => ({
  id: user.cid,
  name: user.name,
  email: user.email,
});

const toActionedResponse = (actioned: {
  at: Date;
  by: { cid: string; name: string; email: string };
}): ApiActioned => ({
  at: actioned.at.toISOString(),
  by: toUserResponse(actioned.by),
});

// TODO: accessUrl 구현하기
const toLocation = (url: string): ApiLocation => ({ url, accessUrl: url });

const toContentResponse = (
  content: Nullable<ContentType>,
): Nullable<ApiContent> => {
  if (!content) {
    return null;
  }

  const result: ApiContent = {
    location: toLocation(content.url),
    size: content.size,
    eTag: content.eTag,
    mimeType: content.mimeType,
  };

  if (content.thumbnail) {
    result.thumbnail = {
      location: toLocation(content.thumbnail.url),
      size: content.thumbnail.size,
      eTag: content.thumbnail.eTag,
      mimeType: content.thumbnail.mimeType,
      blurhash: content.thumbnail.blurhash,
    };
  }

  return result;
};

export const toMediaResponse = (media: Media): ApiMedia => {
  const result: ApiMedia = {
    id: media.cid,
    description: media.description,
    state: media.state,
    isFavorite: media.isFavorite,
    created: toActionedResponse({
      at: media.created.at,
      by: {
        cid: media.created.by.cid,
        name: media.created.by.name,
        email: media.created.by.email.value,
      },
    }),
  };

  const content = toContentResponse(media.content ? media.content.data : null);
  if (content) {
    result.content = content;
  }

  return result;
};

export const toPaginationResponse = (
  pagination: ListMediaPagination,
): ApiPagination => {
  // TODO: sortBy 하드코딩 제거하기
  const result: ApiPagination = {
    size: pagination.size,
    sortBy: 'CREATED_AT',
    order: pagination.order as ApiPagination['order'],
    hasNext: pagination.hasNext,
  };

  if (pagination.nextCursor) {
    result.nextCursor = pagination.nextCursor;
  }

  return result;
};
