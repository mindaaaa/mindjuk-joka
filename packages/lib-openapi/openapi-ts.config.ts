import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './docs/api-v1.yml',
  output: './src/generated/type',
  plugins: [
    '@hey-api/typescript',
    {
      name: 'zod',
      compatibilityVersion: 4,
    },
  ],
});
