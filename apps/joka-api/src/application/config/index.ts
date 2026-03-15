import { MediaRepository } from '@joka/domain-media/src/infrastructure/persistence/media.repository';
import { MediaService } from '@joka/domain-media/src/service/media.service';

const mediaRepository = new MediaRepository();
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
