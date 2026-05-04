import { UnauthorizedException } from '@joka/core/src/exception';
import { Hono } from 'hono';

import Config from '../../../application/config';
import type { CloudflareEnv } from '../../../application/model';

const albums = new Hono<CloudflareEnv>().basePath('/v1/albums');

albums.get('/', async (c) => {
  const jwtPayload = c.get('jwtPayload');

  const user = await Config.authService.findUserOrNull(jwtPayload.sub);
  if (!user) {
    throw new UnauthorizedException('INVALID_TOKEN', [
      '유효하지 않은 인증 토큰입니다.',
    ]);
  }

  const sizeParam = c.req.query('size');
  const cursorParam = c.req.query('cursor');
  const orderParam = c.req.query('order');

  const request: Record<string, unknown> = {};
  if (sizeParam) {
    request.limit = Number(sizeParam);
  }
  if (cursorParam) {
    request.cursor = cursorParam;
  }
  if (orderParam) {
    request.sortOrder = orderParam;
  }

  const result = await Config.actorService.list(user, request);

  return c.json(
    {
      items: result.items.map((actor) => ({
        id: actor.album.cid,
        name: actor.album.name,
      })),
      pagination: result.pagination,
    },
    200,
  );
});

export default albums;
