import { GetMedia, Request, Response } from '../../../domain/use-case/GetMedia';
import Config from '../../config';

export class GetMediaImpl extends GetMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { album, user, mediaCid } = request;

    return this.mediaService.get({ album, user }, { cid: mediaCid });
  }
}

export default new GetMediaImpl();
