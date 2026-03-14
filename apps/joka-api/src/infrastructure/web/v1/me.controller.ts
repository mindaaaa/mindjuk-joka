import { Hono } from 'hono';

import type { CloudflareEnv } from '../../../application/model';

const me = new Hono<CloudflareEnv>().basePath('/v1/me');

me.get('/', (c) => {
  console.log(JSON.stringify(c, null, 2));
  return c.text('Get Me');
});

export default me;
