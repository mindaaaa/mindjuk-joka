import { Actor } from '@joka/domain-actor/src/domain/Actor';
import type { JwtPayload } from 'packages/domain-auth/src/domain/helper/jwt.provider';

// 썸네일 추출 큐(thumbnail-jobs) 메시지 스키마.
// 객체로 두어 향후 필드 확장 여지를 남긴다.
export interface ThumbnailJob {
  mediaCid: string;
}

export interface CloudflareEnv {
  Bindings: {
    HYPERDRIVE?: Hyperdrive;
    NEON_DATABASE_URL?: string;
    OBJECT_STORAGE_ACCESS_KEY_ID: string;
    OBJECT_STORAGE_SECRET_ACCESS_KEY: string;
    OBJECT_STORAGE_ENDPOINT: string;
    OBJECT_STORAGE_BUCKET_NAME: string;
    THUMBNAIL_QUEUE: Queue<ThumbnailJob>;
    AUTH_TOKENS: KVNamespace;
    KAKAO_CLIENT_ID: string;
    KAKAO_CLIENT_SECRET: string;
    KAKAO_REDIRECT_URI: string;
    JWT_SECRET: string;
    AUTH_SUCCESS_REDIRECT?: string;
    ALLOWED_ORIGINS?: string;
    COOKIE_DOMAIN?: string;
  };
  Variables: {
    actor: Actor;
    jwtPayload: JwtPayload;
  };
}
