import type { MediaDto, Photo } from '../model/types';

/**
 * GET /v1/media item(MediaDto) → Photo.
 * - content가 없으면(DRAFT/PREPARING) imageUrl/downloadUrl/mimeType/size를 생략한다.
 * - imageUrl(상세)·downloadUrl(다운로드)은 원본 location.accessUrl을 쓴다.
 * - thumbnail이 있으면(추출 완료) 목록 표시용 thumbnailUrl·blurhash를 채운다.
 * - 추출은 비동기라 없을 수 있고, 그때 목록은 imageUrl로 폴백한다.
 */
export function toPhoto(dto: MediaDto): Photo {
  const { at: createdAt, by: createdBy } = dto.created;
  const accessUrl = dto.content?.location.accessUrl;
  const thumbnail = dto.content?.thumbnail;

  return {
    id: dto.id,
    description: dto.description,
    state: dto.state,
    isFavorite: dto.isFavorite,
    createdAt,
    createdBy,
    ...(accessUrl && { imageUrl: accessUrl, downloadUrl: accessUrl }),
    ...(thumbnail && {
      thumbnailUrl: thumbnail.location.accessUrl,
      blurhash: thumbnail.blurhash,
    }),
    ...(dto.content && {
      mimeType: dto.content.mimeType,
      size: dto.content.size,
    }),
  };
}
