import { InvalidArgumentException } from '@joka/core/src/exception';
import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';

import { Payload } from '../domain/type';
import { UserEvent } from '../domain/UserEvent';
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

    await this.repository.insertMany(events);

    return null;
  }
}
