import {
  ListMedia,
  Request,
  Response,
} from '../../../domain/use-case/ListMedia';
import Config from '../../config';

export class ListMediaImpl extends ListMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, size, order, cursor, states, isFavorite } = request;
    const { album, user } = actor;

    const listRequest: {
      limit?: number;
      sortOrder?: string;
      cursor?: string;
      states?: string[];
      isFavorite?: boolean;
    } = {};

    if (size) {
      listRequest.limit = Number(size);
    }
    if (order) {
      listRequest.sortOrder = order;
    }
    if (cursor) {
      listRequest.cursor = cursor;
    }
    if (states) {
      listRequest.states = states.split(',');
    }
    if (isFavorite === 'true') {
      listRequest.isFavorite = true;
    }
    if (isFavorite === 'false') {
      listRequest.isFavorite = false;
    }

    return this.mediaService.list({ album, user }, listRequest);
  }
}

export default new ListMediaImpl();
