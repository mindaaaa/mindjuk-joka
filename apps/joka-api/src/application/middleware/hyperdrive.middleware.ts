import ClientFactory from '@joka/lib-drizzle/src/client';
import { createMiddleware } from 'hono/factory';

import type { CloudflareEnv } from '../model';

const hyperdriveMiddleware = createMiddleware<CloudflareEnv>(
  async (c, next) => {
    const hyperdrive = c.env.HYPERDRIVE;
    if (hyperdrive) {
      ClientFactory.configure(hyperdrive.connectionString);
    }
    await next();
  },
);

export default hyperdriveMiddleware;
