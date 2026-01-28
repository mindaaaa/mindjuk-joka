import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const DB_ENDPOINT = process.env.DB_ENDPOINT!;

const client = postgres(DB_ENDPOINT);

export const db = drizzle(client, { schema });
