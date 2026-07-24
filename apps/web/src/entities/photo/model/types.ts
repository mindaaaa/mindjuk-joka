import type {
  MediaContent,
  MediaDto,
  MediaListResponse,
  MediaPagination,
  MediaThumbnail,
} from '@/shared/api/schemas';

export type PhotoState = 'DRAFT' | 'PREPARING' | 'COMPLETE';

/**
 * 이미지 로드 실패 핸들러.
 * - attempt 1: 첫 실패 → 새 src(재서명 URL)를 반환하면 그걸로 한 번 더 시도한다
 * - attempt 2: 재시도까지 실패 → 반환값은 무시하고 실패로 확정한다
 */
export type ImageErrorHandler = (
  attempt: number,
) => Promise<string | undefined> | void;

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

/** 서버 응답(DTO) 타입은 OpenAPI 스펙에서 생성된 스키마에서 파생한다. */
export type {
  MediaContent,
  MediaDto,
  MediaListResponse,
  MediaPagination,
  MediaThumbnail,
};

/** useInfiniteQuery 캐시 형태 (setQueriesData/getQueriesData용) */
export interface InfiniteMedia {
  pages: MediaListResponse[];
  pageParams: unknown[];
}
