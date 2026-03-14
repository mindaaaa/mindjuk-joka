import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema';

// const DB_ENDPOINT = process.env.DB_ENDPOINT!;
const DB_ENDPOINT = 'postgres://admin:my-very-secure-pw@localhost:5432/mindjuk';

class ClientFactory {
  static createInstance() {
    const client = postgres(DB_ENDPOINT, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    return drizzle(client, {
      schema,
    });
  }

  private constructor() {}
}

export default ClientFactory;
