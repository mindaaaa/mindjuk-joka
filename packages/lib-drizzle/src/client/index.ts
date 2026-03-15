import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema';

class ClientFactory {
  private static endpoint: string;

  static configure(endpoint: string) {
    this.endpoint = endpoint;
  }

  static createInstance() {
    const client = postgres(this.endpoint, {
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
