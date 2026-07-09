export type PhotoState = 'DRAFT' | 'PREPARING' | 'COMPLETE';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

/**
 * 목록/그리드에서 사용하는 프론트 도메인 모델.
 *
 * URL 3종은 용도가 다르다(모두 presigned accessUrl)
 *   - thumbnailUrl: 목록/그리드 표시용 경량 썸네일. 추출은 비동기라 없을 수 있음.
 *   - imageUrl: 상세 화면 표시용 원본.
 *   - downloadUrl: 다운로드용 원본.
 *
 * 썸네일이 아직 없으면(추출 전) 목록은 imageUrl로 폴백한다.
 *
 * blurhash는 썸네일 로드 전 placeholder 렌더용.
 */
export interface Photo {
  id: string;
  description: string;
  state: PhotoState;
  imageUrl?: string;
  thumbnailUrl?: string;
  blurhash?: string;
  downloadUrl?: string;
  mimeType?: string;
  size?: number;
  isFavorite: boolean;
  createdAt: string;
  createdBy: UserSummary;
}

export interface MediaLocation {
  url: string;
  accessUrl: string;
}

export interface MediaThumbnail {
  location: MediaLocation;
  size: number;
  eTag: string;
  mimeType: string;
  blurhash: string;
}

export interface MediaContent {
  location: MediaLocation;
  size: number;
  eTag: string;
  mimeType: string;
  thumbnail?: MediaThumbnail | null;
}

export interface MediaCreated {
  at: string;
  by: UserSummary;
}

export interface MediaDto {
  id: string;
  description: string;
  state: PhotoState;
  content?: MediaContent | null;
  isFavorite: boolean;
  created: MediaCreated;
}

export interface MediaPagination {
  size: number;
  sortBy: 'CREATED_AT';
  order: 'ASC' | 'DESC';
  nextCursor?: string;
  hasNext: boolean;
}

export interface MediaListResponse {
  items: MediaDto[];
  pagination: MediaPagination;
}

/** useInfiniteQuery 캐시 형태 (setQueriesData/getQueriesData용) */
export interface InfiniteMedia {
  pages: MediaListResponse[];
  pageParams: unknown[];
}
