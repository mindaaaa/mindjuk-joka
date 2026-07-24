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

/**
 * 응답 검증 스키마
 * - zod 스키마가 구조적으로 만족하므로 client는 zod에 직접 의존하지 않는다.
 */
export interface ResponseSchema<T> {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: unknown[] } };
}

export interface HttpInit<T = unknown> extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** 넘기면 응답을 런타임 검증하고 T를 추론한다. 생략하면 검증 없이 그대로 캐스팅한다. */
  schema?: ResponseSchema<T>;
}

/** 스키마 없이 요청 옵션만 전달할 때 쓴다. 응답 타입과 무관하므로 어떤 호출에도 넘길 수 있다. */
export type RequestOptions = Omit<HttpInit, 'schema'>;

export interface HttpClient {
  request<T = unknown>(path: string, init?: HttpInit<T>): Promise<T>;
  get<T = unknown>(path: string, init?: HttpInit<T>): Promise<T>;
  post<T = unknown>(
    path: string,
    body?: unknown,
    init?: HttpInit<T>,
  ): Promise<T>;
  put<T = unknown>(
    path: string,
    body?: unknown,
    init?: HttpInit<T>,
  ): Promise<T>;
  patch<T = unknown>(
    path: string,
    body?: unknown,
    init?: HttpInit<T>,
  ): Promise<T>;
  delete<T = unknown>(path: string, init?: HttpInit<T>): Promise<T>;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  );
}

function normalize(init: HttpInit<unknown>): RequestInit {
  const { body, credentials, schema: _schema, ...rest } = init;
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

/**
 * 응답이 API 계약(OpenAPI 스펙)과 다르면 계약 위반(CONTRACT)으로 다룬다.
 * - HTTP 자체는 성공(2xx)이므로 실제 status를 그대로 싣고, 성격은 code로 구분한다.
 * - 사용자 문구·재시도 정책은 code로 분기된다.
 */
function validate<T>(
  data: unknown,
  schema: ResponseSchema<T>,
  ctx: ApiRequest,
  status: number,
): T {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }

  const err = new ApiError({ status, code: 'CONTRACT' });
  reportApiError(err, {
    url: ctx.url,
    schemaViolation: true,
    issues: parsed.error.issues,
  });
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

  function buildRequest(path: string, init: HttpInit<unknown>): ApiRequest {
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
    init: HttpInit<T> = {},
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
    return init.schema
      ? validate(data, init.schema, ctx, response.status)
      : (data as T);
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
