import { InvalidArgumentException } from '@joka/core/src/exception';
import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';

import { Payload } from '../domain/type';
import { MAX_EVENTS_LENGTH, UserEvent } from '../domain/UserEvent';
import { UserEventRepository } from '../infrastructure/persistence/user-event.repository';

interface Context {
  album: Album;
  user: User;
}
interface CreateRequest {
  events: Payload[];
}

export class UserEventService {
  constructor(private repository: UserEventRepository) {}

  async create(context: Context, request: CreateRequest): Promise<null> {
    const events = request.events.map((event) =>
      UserEvent.from({
        album: context.album,
        user: context.user,
        event,
      }),
    );
    if (!events.length) {
      throw new InvalidArgumentException('EMPTY_PAYLOAD', [
        `저장할 이벤트가 전달되지 않았습니다.`,
      ]);
    }
    if (events.length > MAX_EVENTS_LENGTH) {
      throw new InvalidArgumentException('TOO_MANY_EVENTS', [
        `한 번에 저장할 수 있는 이벤트는 최대 ${MAX_EVENTS_LENGTH}개입니다.`,
      ]);
    }

    await this.repository.insertMany(events);

    return null;
  }
}
