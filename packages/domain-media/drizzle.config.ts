import { defineConfig } from 'drizzle-kit';

// TODO: url 환경 변수로 빼기
export default defineConfig({
  schema: './src/infrastructure/persistence/database/schema.ts',
  out: './.drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: "postgres://admin:my-very-secure-pw@localhost:5432/mindjuk",
  },
  schemaFilter: ["joka"],
});
