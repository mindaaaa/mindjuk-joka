import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema';

class ClientFactory {
  private static endpoint: string;
  private static readEndpoint: string | undefined;

  static configure(endpoint: string) {
    this.endpoint = endpoint;
  }

  // 읽기 경로 Neon endpoint / 미설정시 읽기도 postgres.js를 사용함
  static configureRead(endpoint: string | undefined) {
    this.readEndpoint = endpoint;
  }

  // 쓰기시: Hyperdrive + postgres.js
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

  // 읽기 동작은 기본적으로 neon-http를 사용하며, 읽기 endpoint 미설정시 쓰기 드라이버를 사용한다.
  // 읽기 경로는 .select/.query만 사용하며 .transaction을 사용하지 않는다.
  static createReadInstance(): ReturnType<typeof ClientFactory.createInstance> {
    if (!this.readEndpoint) {
      return this.createInstance();
    }

    const sql = neon(this.readEndpoint);
    return drizzleHttp(sql, { schema }) as unknown as ReturnType<
      typeof ClientFactory.createInstance
    >;
  }

  private constructor() {}
}

export default ClientFactory;
