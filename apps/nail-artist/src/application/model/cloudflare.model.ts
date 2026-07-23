import type { NailClipperContainer } from '../../infrastructure/container/NailClipperContainer';

// 썸네일 추출 큐(thumbnail-jobs) 메시지 스키마.
// joka-api producer가 발행하는 페이로드와 동일하다.
export interface ThumbnailJob {
  mediaCid: string;
}

// Queue consumer가 받는 환경 바인딩.
// joka-api와 달리 Hono가 없으므로 Variables 없이 Bindings만 둔다.
// OBJECT_STORAGE_* 는 joka-api와 동일한 시크릿 키를 재사용한다.
export interface Bindings {
  HYPERDRIVE: Hyperdrive;
  NEON_DATABASE_URL?: string;
  IMAGES: ImagesBinding;
  NAIL_CLIPPER: DurableObjectNamespace<NailClipperContainer>;
  OBJECT_STORAGE_ACCESS_KEY_ID: string;
  OBJECT_STORAGE_SECRET_ACCESS_KEY: string;
  OBJECT_STORAGE_ENDPOINT: string;
  OBJECT_STORAGE_BUCKET_NAME: string;
}
