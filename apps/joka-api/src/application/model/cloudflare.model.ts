import type { Actor } from '../../domain/model/Actor';

export interface CloudflareEnv {
  Bindings: {
    MEDIA_BUCKET: R2Bucket;
    MEDIA_CACHE: KVNamespace;
    HYPERDRIVE?: Hyperdrive;
  };
  Variables: {
    actor: Actor;
  };
}
