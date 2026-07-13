import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
import userEvents from './infrastructure/web/v1/user-events.controller';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173'];

const app = new Hono<CloudflareEnv>().basePath('/api');

app.onError(errorHandler);

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed =
        c.env.ALLOWED_ORIGINS?.split(',')
          .map((s: string) => s.trim())
          .filter(Boolean) ?? DEFAULT_ALLOWED_ORIGINS;
      return allowed.includes(origin) ? origin : null;
    },
    allowHeaders: ['Authorization', 'X-Album-Id', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposeHeaders: ['Location'],
    maxAge: 600,
  }),
);

app.use('*', hyperdrive);
app.use('*', objectStorage);
app.use('*', auth);
app.use('/v1/media/*', actorResolver);
app.use('/v1/user-events/*', actorResolver);

app.route('/', authController);
app.route('/', me);
app.route('/', albums);
app.route('/', media);
app.route('/', userEvents);

export default {
  fetch: app.fetch,
};
