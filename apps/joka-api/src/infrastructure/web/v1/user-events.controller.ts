import { InvalidArgumentException } from '@joka/core/src/exception';
import { Hono } from 'hono';

import type { CloudflareEnv } from '../../../application/model';
import { CreateUserEvents } from '../../../application/use-case';

const userEvents = new Hono<CloudflareEnv>().basePath('/v1/user-events');

userEvents.post('/', async (c) => {
  const { events } = await c.req.json();
  if (!Array.isArray(events)) {
    throw new InvalidArgumentException('INVALID_ARGUMENT', [
      'events는 배열이어야 합니다.',
    ]);
  }

  const actor = c.get('actor');

  await CreateUserEvents.invoke({ actor, events });

  return c.body(null, 204);
});

export default userEvents;
