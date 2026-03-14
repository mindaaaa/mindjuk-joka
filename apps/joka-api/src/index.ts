import { Hono } from 'hono';

import hyperdrive from './application/middleware/hyperdrive.middleware';
import type { CloudflareEnv } from './application/model';
import me from './infrastructure/web/v1/me.controller';
import media from './infrastructure/web/v1/media.controller';

const app = new Hono<CloudflareEnv>().basePath('/api');

app.use('*', hyperdrive);

app.route('/', me);
app.route('/', media);

export default {
  fetch: app.fetch,
};
