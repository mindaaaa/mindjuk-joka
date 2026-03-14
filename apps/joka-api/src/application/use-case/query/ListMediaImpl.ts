import {
  ListMedia,
  Request,
  Response,
} from '../../../domain/use-case/ListMedia';
import Config from '../../config';

export class ListMediaImpl extends ListMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { album, user, size, order, cursor, states } = request;

    const listRequest: {
      limit?: number;
      sortOrder?: string;
      cursor?: string;
      states?: string[];
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

    return this.mediaService.list({ album, user }, listRequest);
  }
}

export default new ListMediaImpl();
