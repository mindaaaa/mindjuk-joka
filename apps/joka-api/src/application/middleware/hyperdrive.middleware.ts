import ClientFactory from '@joka/lib-drizzle/src/client';
import { createMiddleware } from 'hono/factory';

import type { CloudflareEnv } from '../model';

const hyperdriveMiddleware = createMiddleware<CloudflareEnv>(
  async (c, next) => {
    const hyperdrive = c.env.HYPERDRIVE;
    if (hyperdrive) {
      ClientFactory.configure(hyperdrive.connectionString);
    }
    // 읽기 경로 Neon endpoint / 미설정시 읽기도 postgres.js를 사용함
    ClientFactory.configureRead(c.env.NEON_DATABASE_URL);
    await next();
  },
);

export default hyperdriveMiddleware;
