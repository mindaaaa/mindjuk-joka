import { defineConfig } from 'drizzle-kit';

const DB_ENDPOINT = process.env.DB_ENDPOINT!;

export default defineConfig({
  schema: './src/infrastructure/persistence/database/schema.ts',
  out: './.drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: DB_ENDPOINT,
  },
  schemaFilter: ["joka"],
});
