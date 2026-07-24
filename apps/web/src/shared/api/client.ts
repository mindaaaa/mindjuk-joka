import { authTokenStore } from './auth-token';
import { ApiError, reportApiError, toApiError } from './error';
import {
  type ApiRequest,
  attachAuthHeader,
  attachAlbumHeader,
} from './interceptors';
import { createRefresher } from './refresh';

import { env } from '@/shared/config/env';
import { trackApiTiming } from '@/shared/lib/analytics';

const DEFAULT_BASE_URL = env.VITE_API_BASE_URL;
const DEFAULT_REFRESH_PATH = env.VITE_AUTH_REFRESH_PATH;

export interface HttpClientOptions {
  baseURL?: string;
  refreshPath?: string;
  refresh?: () => Promise<string>;
  onUnauthorized?: () => void;
}

export interface HttpInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export interface HttpClient {
  request<T = unknown>(path: string, init?: HttpInit): Promise<T>;
  get<T = unknown>(path: string, init?: HttpInit): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, init?: HttpInit): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, init?: HttpInit): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, init?: HttpInit): Promise<T>;
  delete<T = unknown>(path: string, init?: HttpInit): Promise<T>;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  );
}

function normalize(init: HttpInit): RequestInit {
  const { body, credentials, ...rest } = init;
  const withCredentials: RequestInit = {
    ...rest,
    credentials: credentials ?? 'include',
  };

  if (body === undefined || body === null) {
    return withCredentials;
  }

  if (isRawBody(body)) {
    return { ...withCredentials, body };
  }

  const mergedHeaders = new Headers(rest.headers);
  if (!mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  return {
    ...withCredentials,
    headers: mergedHeaders,
    body: JSON.stringify(body),
  };
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function sendRequest(ctx: ApiRequest): Promise<Response> {
  const method = ctx.options.method ?? 'GET';
  const start = performance.now();

  try {
    const response = await fetch(ctx.url, ctx.options);
    trackApiTiming(ctx.url, method, performance.now() - start, response.status);
    return response;
  } catch (cause) {
    // 네트워크 실패도 status 0으로 계측 (이상치 분석에 포함)
    trackApiTiming(ctx.url, method, performance.now() - start, 0);

    const err = new ApiError({
      status: 0,
      code: 'NETWORK',
      message: '네트워크에 연결할 수 없어요.',
      cause,
    });
    reportApiError(err, { url: ctx.url });
    throw err;
  }
}

async function failWith(
  response: Response,
  ctx: ApiRequest,
  extra?: Record<string, unknown>,
): Promise<never> {
  const err = await toApiError(response);
  reportApiError(err, { url: ctx.url, ...extra });
  throw err;
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const baseURL = options.baseURL ?? DEFAULT_BASE_URL;
  const refresh =
    options.refresh ??
    createRefresher({
      baseURL,
      path: options.refreshPath ?? DEFAULT_REFRESH_PATH,
    });
  const onUnauthorized =
    options.onUnauthorized ?? (() => authTokenStore.clear());

  function buildRequest(path: string, init: HttpInit): ApiRequest {
    return attachAlbumHeader(
      attachAuthHeader({
        url: `${baseURL}${path}`,
        options: normalize(init),
      }),
    );
  }

  async function handleUnauthorized<T>(
    response: Response,
    ctx: ApiRequest,
    retry: () => Promise<T>,
  ): Promise<T> {
    try {
      await refresh();
    } catch {
      onUnauthorized();
      await failWith(response, ctx, { retryFailed: true });
    }
    return retry();
  }

  async function request<T = unknown>(
    path: string,
    init: HttpInit = {},
    isRetry = false,
  ): Promise<T> {
    const ctx = buildRequest(path, init);
    const response = await sendRequest(ctx);

    if (response.status === 401 && !isRetry) {
      return handleUnauthorized(response, ctx, () =>
        request<T>(path, init, true),
      );
    }

    if (!response.ok) {
      await failWith(response, ctx);
    }

    const data = await parseResponse(response);
    return data as T;
  }

  const client: HttpClient = {
    request: (path, init) => request(path, init),
    get: (path, init) => request(path, { ...init, method: 'GET' }),
    post: (path, body, init) =>
      request(path, { ...init, method: 'POST', body }),
    put: (path, body, init) => request(path, { ...init, method: 'PUT', body }),
    patch: (path, body, init) =>
      request(path, { ...init, method: 'PATCH', body }),
    delete: (path, init) => request(path, { ...init, method: 'DELETE' }),
  };
  return client;
}
