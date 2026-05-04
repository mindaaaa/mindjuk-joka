import { Hono } from 'hono';

import type { CloudflareEnv } from '../../../application/model';

const me = new Hono<CloudflareEnv>().basePath('/v1/me');

me.get('/', (c) => {
  const payload = c.get('jwtPayload');
  const actor = c.get('actor');

  return c.json({
    id: payload.cid,
    name: payload.name,
    email: payload.email,
    role: actor?.role ?? null,
  });
});

export default me;
