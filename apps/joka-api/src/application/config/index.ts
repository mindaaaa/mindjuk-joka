import { UncaughtException } from '@joka/core/src/exception';
import { MediaRepository } from '@joka/domain-media/src/infrastructure/persistence/media.repository';
import { MediaService } from '@joka/domain-media/src/service/media.service';

class Config {
  private bucketName: string | null = null;

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
}

export default new Config();
