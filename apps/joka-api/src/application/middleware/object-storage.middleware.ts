import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';
import { createMiddleware } from 'hono/factory';

import Config from '../config';
import type { CloudflareEnv } from '../model';

const objectStorageMiddleware = createMiddleware<CloudflareEnv>(
  async (c, next) => {
    try {
      S3Client.getInstance();
    } catch {
      S3Client.init({
        accessKeyId: c.env.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: c.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        endpoint: c.env.OBJECT_STORAGE_ENDPOINT,
        bucket: c.env.OBJECT_STORAGE_BUCKET_NAME,
      });
    }
    Config.mediaBucketName = c.env.OBJECT_STORAGE_BUCKET_NAME;
    await next();
  },
);

export default objectStorageMiddleware;
