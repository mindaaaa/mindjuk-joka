import { InvalidArgumentException } from '@joka/core/src/exception';
import ClientFactory from '@joka/lib-drizzle/src/client';
import * as Schema from '@joka/lib-drizzle/src/schema';

import { UserEvent } from '../../domain/UserEvent';

const { userEvents } = Schema;

export class UserEventRepository {
  constructor() {}

  private get connection() {
    return ClientFactory.createInstance();
  }

  async insertMany(events: UserEvent[]): Promise<null> {
    if (!events.length) {
      throw new InvalidArgumentException('EMPTY_PAYLOAD', [
        `저장할 이벤트가 전달되지 않았습니다.`,
      ]);
    }

    await this.connection.insert(userEvents).values(
      events.map((event) => ({
        albumId: event.albumId,
        event: event.event,
        createdAt: event.created.at,
        createdById: event.created.by.id,
      })),
    );

    return null;
  }
}
