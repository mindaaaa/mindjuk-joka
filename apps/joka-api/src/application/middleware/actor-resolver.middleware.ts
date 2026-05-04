import { ForbiddenException } from '@joka/core/src/exception';
import { createMiddleware } from 'hono/factory';

import Config from '../config';
import type { CloudflareEnv } from '../model';

const actorResolverMiddleware = createMiddleware<CloudflareEnv>(
  async (c, next) => {
    const albumCid = c.req.header('X-Album-Id');
    if (!albumCid) {
      await next();
      return;
    }

    const jwtPayload = c.get('jwtPayload');
    if (!jwtPayload) {
      await next();
      return;
    }

    const user = await Config.authService.findUserOrNull(jwtPayload.sub);
    if (!user) {
      throw new ForbiddenException('FORBIDDEN', [
        '존재하지 않는 사용자입니다.',
      ]);
    }
    const actor = await Config.actorService.findOneOrNull({
      albumCid: albumCid,
      user,
    });
    if (!actor) {
      throw new ForbiddenException('FORBIDDEN', [
        '해당 앨범에 대한 접근 권한이 없습니다.',
      ]);
    }
    c.set('actor', actor);

    await next();
  },
);

export default actorResolverMiddleware;
