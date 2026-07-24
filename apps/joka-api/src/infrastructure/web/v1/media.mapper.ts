import { Url } from '@joka/core/src/model/Url';
import { Nullable } from '@joka/core/src/type';
import type { ContentType } from '@joka/domain-media/src/domain/Content';
import type { ListMediaPagination } from '@joka/domain-media/src/domain/ListMediaCondition';
import type { Media } from '@joka/domain-media/src/domain/Media';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';
import type {
  Media as ApiMedia,
  Content as ApiContent,
  Location as ApiLocation,
  Actioned as ApiActioned,
  User as ApiUser,
  ListMediaResponses,
} from '@joka/lib-openapi/src/generated/type/types.gen';

import Config from '../../../application/config';

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

const toLocation = async (url: string): Promise<ApiLocation> => {
  const path = Url.from(url).getPath({ withoutBeginningSlash: true });
  const prefix = Config.mediaBucketName + '/';
  const key = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const presignedUrl = await S3Client.getInstance().getPresignedUrl(
    Config.mediaBucketName,
    key,
  );
  return { url, accessUrl: presignedUrl.fullPath };
};

export const toContentResponse = async (
  content: Nullable<ContentType>,
): Promise<Nullable<ApiContent>> => {
  if (!content) {
    return null;
  }

  const result: ApiContent = {
    location: await toLocation(content.url),
    size: content.size,
    eTag: content.eTag,
    mimeType: content.mimeType,
  };

  if (content.thumbnail) {
    result.thumbnail = {
      location: await toLocation(content.thumbnail.url),
      size: content.thumbnail.size,
      eTag: content.thumbnail.eTag,
      mimeType: content.thumbnail.mimeType,
      blurhash: content.thumbnail.blurhash,
    };
  }

  return result;
};

export const toMediaResponse = async (media: Media): Promise<ApiMedia> => {
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

  const content = await toContentResponse(
    media.content ? media.content.data : null,
  );
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
    order: pagination.order,
    hasNext: pagination.hasNext,
  };

  if (pagination.nextCursor) {
    result.nextCursor = pagination.nextCursor;
  }

  return result;
};
