import {
  ForbiddenException,
  InvalidArgumentException,
  UncaughtException,
} from '@joka/core/src/exception';
import { createMiddleware } from 'hono/factory';

import Config from '../config';
import type { CloudflareEnv } from '../model';

type ActorResolverOptions = {
  required: boolean;
};

const tryToThrowByOptions = (shouldThrow: boolean) => {
  if (shouldThrow) {
    throw new InvalidArgumentException('REQUIRED_HEADER_OMITTED', [
      'X-Album-Id 헤더가 누락되었습니다.',
    ]);
  }
};

const actorResolverMiddleware = (options: ActorResolverOptions) =>
  createMiddleware<CloudflareEnv>(async (c, next) => {
    const albumCid = c.req.header('X-Album-Id');
    if (!albumCid) {
      tryToThrowByOptions(options.required);

      await next();
      return;
    }

    const jwtPayload = c.get('jwtPayload');
    if (!jwtPayload) {
      throw new UncaughtException('FAILED_TO_RESOLVE_TOKEN_PAYLOAD', [
        '토큰 페이로드를 조회하는 데에 실패했습니다.',
        '관리자에게 문의하세요.',
      ]);
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
  });

export default actorResolverMiddleware;
