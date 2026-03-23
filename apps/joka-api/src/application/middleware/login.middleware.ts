import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Actor } from '@joka/domain-actor/src/domain/Actor';
import { createMiddleware } from 'hono/factory';

import type { CloudflareEnv } from '../model';

const loginMiddleware = createMiddleware<CloudflareEnv>(async (c, next) => {
  const actor = Actor.from({
    album: Album.from({
      id: 1,
      cid: '7b799ad4-41b5-4f66-ba7c-b6f148f64f00',
      name: 'dev',
      description: 'for test',
      isDeleted: false,
    }),
    user: User.from({
      id: 1,
      cid: 'efbef729-c015-437e-a8ff-72e77f589038',
      name: 'tester',
      email: 'tester@naver.com',
    }),
    role: 'ADMIN',
  });

  c.set('actor', actor);
  await next();
});

export default loginMiddleware;
