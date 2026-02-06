import { MediaRepository } from '@joka/domain-media/src/infrastructure/persistence/media.repository';
import { MediaService } from '@joka/domain-media/src/service/media.service';
import { db } from '@joka/lib-drizzle/src/client';

const mediaRepository = new MediaRepository(db);
const mediaService = new MediaService(mediaRepository);

class Config {
  get mediaRepository() {
    return mediaRepository;
  }

  get mediaService() {
    return mediaService;
  }
}

export default new Config();
