import createClient from 'openapi-fetch';

import type { paths } from './generated/api-v1';

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}
