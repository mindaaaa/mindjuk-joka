import {
  CreateMedia,
  Request,
  Response,
} from '../../../domain/use-case/CreateMedia';
import Config from '../../config';

export class CreateMediaImpl extends CreateMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { album, user, description } = request;

    return this.mediaService.create({ album, user }, { description });
  }
}

export default new CreateMediaImpl();
