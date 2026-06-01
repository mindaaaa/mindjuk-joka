import type { MediaDto, Photo } from '../model/types';

/**
 * GET /v1/media item(MediaDto) → Photo.
 * - content가 없으면(DRAFT/PREPARING) imageUrl/downloadUrl/mimeType/size를 생략한다.
 * - 썸네일은 현재 백엔드 미지원이므로 원본 location.accessUrl을 표시·다운로드에 함께 사용한다.
 */
export function toPhoto(dto: MediaDto): Photo {
  const { at: createdAt, by: createdBy } = dto.created;
  const accessUrl = dto.content?.location.accessUrl;

  return {
    id: dto.id,
    description: dto.description,
    state: dto.state,
    isFavorite: dto.isFavorite,
    createdAt,
    createdBy,
    ...(accessUrl && { imageUrl: accessUrl, downloadUrl: accessUrl }),
    ...(dto.content && {
      mimeType: dto.content.mimeType,
      size: dto.content.size,
    }),
  };
}
