import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// TODO: url 환경 변수로 빼기
const connectionString =
  'postgres://admin:my-very-secure-pw@localhost:5432/mindjuk';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
