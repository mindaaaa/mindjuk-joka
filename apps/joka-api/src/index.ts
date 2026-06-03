import { Hono } from 'hono';

import actorResolver from './application/middleware/actor-resolver.middleware';
import errorHandler from './application/middleware/advice.middleware';
import auth from './application/middleware/auth.middleware';
import hyperdrive from './application/middleware/hyperdrive.middleware';
import objectStorage from './application/middleware/object-storage.middleware';
import type { CloudflareEnv } from './application/model';
import albums from './infrastructure/web/v1/albums.controller';
import authController from './infrastructure/web/v1/auth.controller';
import me from './infrastructure/web/v1/me.controller';
import media from './infrastructure/web/v1/media.controller';

const app = new Hono<CloudflareEnv>().basePath('/api');

app.onError(errorHandler);

app.use('*', hyperdrive);
app.use('*', objectStorage);
app.use('*', auth);
app.use('/v1/media/*', actorResolver);

app.route('/', authController);
app.route('/', me);
app.route('/', albums);
app.route('/', media);

export default {
  fetch: app.fetch,
};
