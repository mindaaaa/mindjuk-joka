import { Actor } from '@joka/domain-actor/src/domain/Actor';
import type { JwtPayload } from 'packages/domain-auth/src/domain/helper/jwt.provider';

export interface CloudflareEnv {
  Bindings: {
    MEDIA_BUCKET: R2Bucket;
    MEDIA_CACHE: KVNamespace;
    HYPERDRIVE?: Hyperdrive;
    OBJECT_STORAGE_ACCESS_KEY_ID: string;
    OBJECT_STORAGE_SECRET_ACCESS_KEY: string;
    OBJECT_STORAGE_ENDPOINT: string;
    OBJECT_STORAGE_BUCKET_NAME: string;
    AUTH_TOKENS: KVNamespace;
    KAKAO_CLIENT_ID: string;
    KAKAO_CLIENT_SECRET: string;
    KAKAO_REDIRECT_URI: string;
    JWT_SECRET: string;
    AUTH_SUCCESS_REDIRECT?: string;
    ALLOWED_ORIGINS?: string;
  };
  Variables: {
    actor: Actor;
    jwtPayload: JwtPayload;
  };
}
