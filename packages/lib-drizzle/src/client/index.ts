import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema';

// const DB_ENDPOINT = process.env.DB_ENDPOINT!;
const DB_ENDPOINT = 'postgres://admin:my-very-secure-pw@localhost:5432/mindjuk';

const client = postgres(DB_ENDPOINT);

export const db = drizzle(client, {
  schema,
});
