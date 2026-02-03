import { defineConfig } from 'drizzle-kit';

const DB_ENDPOINT = process.env.DB_ENDPOINT!;

// TODO: 추후 domain-media 모듈이 아닌 최상위 depth로 빠져야 함
export default defineConfig({
  schema: './src/infrastructure/persistence/database/schema.ts',
  out: './.drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: DB_ENDPOINT,
  },
  schemaFilter: ['joka'],
});
