import { UncaughtException } from '@joka/core/src/exception';
import { MediaRepository } from '@joka/domain-media/src/infrastructure/persistence/media.repository';
import { MediaService } from '@joka/domain-media/src/service/media.service';
import { ImagesPort } from '@joka/infra-thumbnail/src';

import { ThumbnailStrategy } from '../../domain/strategy/ThumbnailStrategy';
import { NailClipperContainer } from '../../infrastructure/container/NailClipperContainer';
import { CloudflareImagesAdapter } from '../../infrastructure/images/CloudflareImagesAdapter';
import { ImageThumbnailStrategy } from '../../infrastructure/strategy/ImageThumbnailStrategy';
import { VideoThumbnailStrategy } from '../../infrastructure/strategy/VideoThumbnailStrategy';

class Config {
  private bucketName: string | null = null;
  private imagesBinding: ImagesBinding | null = null;
  private nailClipperBinding: DurableObjectNamespace<NailClipperContainer> | null =
    null;

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
  // 소비자에겐 좁은 ImagesPort로만 노출하고, Workers 바인딩은 어댑터가 감싼다.
  get images(): ImagesPort {
    if (!this.imagesBinding) {
      throw new UncaughtException('IMAGES binding is not configured');
    }
    return new CloudflareImagesAdapter(this.imagesBinding);
  }

  set images(value: ImagesBinding) {
    this.imagesBinding = value;
  }

  // 배치 진입 시 env.NAIL_CLIPPER(컨테이너 DO 네임스페이스)를 전역에 주입한다(ADR D8).
  get nailClipper(): DurableObjectNamespace<NailClipperContainer> {
    if (!this.nailClipperBinding) {
      throw new UncaughtException('NAIL_CLIPPER binding is not configured');
    }
    return this.nailClipperBinding;
  }

  set nailClipper(value: DurableObjectNamespace<NailClipperContainer>) {
    this.nailClipperBinding = value;
  }

  // mimeType 우선순위 순으로 전략을 선택한다.
  get thumbnailStrategies(): ThumbnailStrategy[] {
    return [new ImageThumbnailStrategy(), new VideoThumbnailStrategy()];
  }
}

export default new Config();
