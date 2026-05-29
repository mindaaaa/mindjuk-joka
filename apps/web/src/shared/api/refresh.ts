import { z } from 'zod';
import { authTokenStore } from './auth-token';
import { ApiError, codeFromStatus } from './error';

export interface RefresherOptions {
  baseURL: string;
  path?: string;
}

const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export function createRefresher(
  options: RefresherOptions,
): () => Promise<string> {
  const refreshPath = options.path ?? '/v1/auth/refresh';
  const refreshURL = `${options.baseURL}${refreshPath}`;

  let inflightRequest: Promise<string> | null = null;

  async function performRefresh(): Promise<string> {
    const response = await fetch(refreshURL, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      authTokenStore.clear();
      throw new ApiError({
        status: response.status,
        code: codeFromStatus(response.status),
        message: '로그인이 만료되었어요. 다시 로그인해 주세요.',
        payload: { endpoint: 'auth/refresh' },
      });
    }

    const parsed = RefreshResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ApiError({
        status: 502,
        code: 'SERVER',
        message:
          '문제가 발생했어요. 잠시 후에도 같은 문제가 계속되면 고객센터로 문의해 주세요.',
        payload: {
          endpoint: 'auth/refresh',
          issues: parsed.error.issues,
        },
        cause: parsed.error,
      });
    }

    authTokenStore.set(parsed.data.accessToken);
    return parsed.data.accessToken;
  }

  return function refresh() {
    if (inflightRequest) {
      return inflightRequest;
    }

    inflightRequest = performRefresh().finally(() => {
      inflightRequest = null;
    });

    return inflightRequest;
  };
}
