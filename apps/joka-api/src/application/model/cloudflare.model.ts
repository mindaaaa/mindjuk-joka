export interface CloudflareEnv {
  Bindings: {
    MEDIA_BUCKET: R2Bucket;
    MEDIA_CACHE: KVNamespace;
    HYPERDRIVE?: Hyperdrive;
  };
}
