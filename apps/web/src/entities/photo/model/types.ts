export type PhotoState = 'DRAFT' | 'PREPARING' | 'COMPLETE';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

/**
 * 목록/그리드에서 사용하는 프론트 도메인 모델.
 *
 * 현재 썸네일/blurhash를 생성하지 않으므로
 *   - content.thumbnail === null
 *   - 표시·다운로드 모두 원본 content.location.accessUrl(presigned)을 사용
 */
export interface Photo {
  id: string;
  description: string;
  state: PhotoState;
  imageUrl?: string;
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
