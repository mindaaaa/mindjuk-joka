import {
  CreateUserEvents,
  Request,
  Response,
} from '../../../domain/use-case/CreateUserEvents';
import Config from '../../config';

export class CreateUserEventsImpl extends CreateUserEvents {
  private readonly userEventService = Config.userEventService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, events } = request;
    const { album, user } = actor;

    return this.userEventService.create({ album, user }, { events });
  }
}

export default new CreateUserEventsImpl();
