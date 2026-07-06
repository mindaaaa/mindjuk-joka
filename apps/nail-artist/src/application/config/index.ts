import { UncaughtException } from '@joka/core/src/exception';
import { MediaRepository } from '@joka/domain-media/src/infrastructure/persistence/media.repository';
import { MediaService } from '@joka/domain-media/src/service/media.service';
import { ImagesPort } from '@joka/infra-thumbnail/src';

import { ThumbnailStrategy } from '../../domain/strategy/ThumbnailStrategy';
import { ImageThumbnailStrategy } from '../../infrastructure/strategy/ImageThumbnailStrategy';
import { VideoThumbnailStrategy } from '../../infrastructure/strategy/VideoThumbnailStrategy';

class Config {
  private bucketName: string | null = null;
  private imagesPort: ImagesPort | null = null;

  get mediaService() {
    const mediaRepository = new MediaRepository();
    return new MediaService(mediaRepository);
  }

  get mediaBucketName(): string {
    if (!this.bucketName) {
      throw new UncaughtException('S3 bucket is not configured');
    }
    return this.bucketName;
  }

  set mediaBucketName(value: string) {
    this.bucketName = value;
  }

  // 배치 진입 시 env.IMAGES를 전역에 주입한다(joka-api의 batch-wiring 관용구와 동형).
  get images(): ImagesPort {
    if (!this.imagesPort) {
      throw new UncaughtException('IMAGES binding is not configured');
    }
    return this.imagesPort;
  }

  set images(value: ImagesPort) {
    this.imagesPort = value;
  }

  // mimeType 우선순위 순으로 전략을 선택한다.
  get thumbnailStrategies(): ThumbnailStrategy[] {
    return [new ImageThumbnailStrategy(), new VideoThumbnailStrategy()];
  }
}

export default new Config();
