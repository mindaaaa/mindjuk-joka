import { Actor } from '@joka/domain-actor/src/domain/Actor';

export interface CloudflareEnv {
  Bindings: {
    MEDIA_BUCKET: R2Bucket;
    MEDIA_CACHE: KVNamespace;
    HYPERDRIVE?: Hyperdrive;
    OBJECT_STORAGE_ACCESS_KEY_ID: string;
    OBJECT_STORAGE_SECRET_ACCESS_KEY: string;
    OBJECT_STORAGE_ENDPOINT: string;
    OBJECT_STORAGE_BUCKET_NAME: string;
  };
  Variables: {
    actor: Actor;
  };
}
