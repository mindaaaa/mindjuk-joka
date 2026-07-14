import {
  RemoveFavorite,
  Request,
  Response,
} from '../../../domain/use-case/RemoveFavorite';
import Config from '../../config';

export class RemoveFavoriteImpl extends RemoveFavorite {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid } = request;
    const { album, user } = actor;

    await this.mediaService.removeFavorite({ album, user }, { cid: mediaCid });

    return null;
  }
}

export default new RemoveFavoriteImpl();
