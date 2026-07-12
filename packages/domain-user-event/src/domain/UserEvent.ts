import { Actioned } from '@joka/core/src/model/Actioned';
import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { z } from 'zod';

import { Payload } from './type';

interface ConstructorParameters {
  album: Album;
  user: User;
  event: Payload;
}

export class UserEvent {
  static from(params: ConstructorParameters): UserEvent {
    const created = Actioned.from({ by: params.user });
    const userEvent = new UserEvent(params.album.id, params.event, created);

    UserEvent.Schema.parse(userEvent.data);

    return userEvent;
  }

  static get Schema() {
    return z.object({
      albumId: z.number().positive(),
      event: z.looseObject({
        name: z.string().min(1),
        timestamp: z.number(),
        userRole: z.enum(['EDITOR', 'VIEWER', 'ADMIN']),
      }),
      created: Actioned.Schema,
    });
  }

  private constructor(
    public readonly albumId: number,
    public readonly event: Payload,
    public readonly created: Actioned,
  ) {}

  get data() {
    const data = {
      ...this,
      created: {
        at: this.created.at,
        by: {
          ...this.created.by,
          email: this.created.by.email.value,
        },
      },
    };

    UserEvent.Schema.parse(data);

    return data;
  }
}

export type UserEventType = z.infer<typeof UserEvent.Schema>;
