import { Hono } from 'hono';

import errorHandler from './application/middleware/advice.middleware';
import hyperdrive from './application/middleware/hyperdrive.middleware';
import login from './application/middleware/login.middleware';
import objectStorage from './application/middleware/object-storage.middleware';
import type { CloudflareEnv } from './application/model';
import me from './infrastructure/web/v1/me.controller';
import media from './infrastructure/web/v1/media.controller';

const app = new Hono<CloudflareEnv>().basePath('/api');

app.onError(errorHandler);

app.use('*', hyperdrive);
app.use('*', objectStorage);
app.use('*', login);

app.route('/', me);
app.route('/', media);

export default {
  fetch: app.fetch,
};
