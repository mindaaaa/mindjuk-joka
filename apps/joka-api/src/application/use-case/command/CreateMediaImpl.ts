import {
  CreateMedia,
  Request,
  Response,
} from '../../../domain/use-case/CreateMedia';
import Config from '../../config';

export class CreateMediaImpl extends CreateMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, description } = request;
    const { album, user } = actor;

    return this.mediaService.create({ album, user }, { description });
  }
}

export default new CreateMediaImpl();
