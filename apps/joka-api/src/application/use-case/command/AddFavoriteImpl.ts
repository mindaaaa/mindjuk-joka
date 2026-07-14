import {
  AddFavorite,
  Request,
  Response,
} from '../../../domain/use-case/AddFavorite';
import Config from '../../config';

export class AddFavoriteImpl extends AddFavorite {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid } = request;
    const { album, user } = actor;

    await this.mediaService.addFavorite({ album, user }, { cid: mediaCid });

    return null;
  }
}

export default new AddFavoriteImpl();
