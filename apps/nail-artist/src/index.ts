import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';
import ClientFactory from '@joka/lib-drizzle/src/client';

import Config from './application/config';
import type { Bindings, ThumbnailJob } from './application/model';
import { consumeThumbnailBatch } from './infrastructure/queue/thumbnail.consumer';

// 컨테이너 DO 클래스는 Worker main 모듈에서 export되어야 wrangler가 배포한다(ADR §3.5).
export { NailClipperContainer } from './infrastructure/container/NailClipperContainer';

export default {
  async queue(batch: MessageBatch<ThumbnailJob>, env: Bindings): Promise<void> {
    // 배치당 1회 배선 (joka-api의 hyperdrive/object-storage 미들웨어 관용구와 동형).
    ClientFactory.configure(env.HYPERDRIVE.connectionString);
    ClientFactory.configureRead(env.NEON_DATABASE_URL);

    try {
      S3Client.getInstance();
    } catch {
      // 미초기화일 때만 init (중복 init은 throw).
      S3Client.init({
        accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        endpoint: env.OBJECT_STORAGE_ENDPOINT,
        bucket: env.OBJECT_STORAGE_BUCKET_NAME,
      });
    }

    Config.mediaBucketName = env.OBJECT_STORAGE_BUCKET_NAME;
    // 요청 스코프 IMAGES 바인딩을 전역에 주입한다(어댑터가 좁은 포트로 감쌈).
    Config.images = env.IMAGES;
    // nail-clipper 컨테이너 바인딩을 전역에 주입한다(영상 전략에서 사용).
    Config.nailClipper = env.NAIL_CLIPPER;

    await consumeThumbnailBatch(batch);
  },
};
