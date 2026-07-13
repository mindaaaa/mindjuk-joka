import { UncaughtException } from '@joka/core/src/exception';
import { ActorRepository } from '@joka/domain-actor/src/infrastructure/persistence/actor.repository';
import { ActorService } from '@joka/domain-actor/src/service/actor.service';
import { AuthService } from '@joka/domain-auth/src/service/auth.service';
import { MediaRepository } from '@joka/domain-media/src/infrastructure/persistence/media.repository';
import { MediaService } from '@joka/domain-media/src/service/media.service';
import { UserEventRepository } from '@joka/domain-user-event/src/infrastructure/persistence/user-event.repository';
import { UserEventService } from '@joka/domain-user-event/src/service/user-event.service';

class Config {
  private bucketName: string | null = null;

  get authService() {
    return new AuthService();
  }

  get actorService() {
    const actorRepository = new ActorRepository();
    return new ActorService(actorRepository);
  }

  get mediaService() {
    const mediaRepository = new MediaRepository();
    return new MediaService(mediaRepository);
  }

  get userEventService() {
    const userEventRepository = new UserEventRepository();
    return new UserEventService(userEventRepository);
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
