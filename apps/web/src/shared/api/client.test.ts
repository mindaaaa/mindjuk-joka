import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { authTokenStore } from './auth-token';
import { createHttpClient } from './client';

const BASE = 'http://api.test';
const REFRESH_PATH = '/v1/auth/refresh';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

function stubFetch(impl: FetchFn) {
  const spy = vi.fn(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  if (!init?.headers) return null;
  const headers =
    init.headers instanceof Headers ? init.headers : new Headers(init.headers);
  return headers.get(name);
}

describe('createHttpClient', () => {
  beforeEach(() => {
    authTokenStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Authorization 헤더', () => {
    test('토큰이 있으면 Bearer로 주입한다', async () => {
      authTokenStore.set('access-1');
      const fetchSpy = stubFetch(async () => jsonResponse({ ok: true }));

      const http = createHttpClient({ baseURL: BASE });
      await http.get('/me');

      const [, init] = fetchSpy.mock.calls[0];
      expect(headerOf(init, 'Authorization')).toBe('Bearer access-1');
    });

    test('토큰이 없으면 헤더를 주입하지 않는다', async () => {
      const fetchSpy = stubFetch(async () => jsonResponse({ ok: true }));

      const http = createHttpClient({ baseURL: BASE });
      await http.get('/public');

      const [, init] = fetchSpy.mock.calls[0];
      expect(headerOf(init, 'Authorization')).toBeNull();
    });
  });

  describe('401 → refresh → retry', () => {
    test('refresh 성공 시 새 토큰으로 재시도하고 응답을 반환한다', async () => {
      authTokenStore.set('access-old');
      const fetchSpy = stubFetch(async (url) => {
        if (url.endsWith(REFRESH_PATH)) {
          authTokenStore.set('access-new');
          return jsonResponse({ accessToken: 'access-new' });
        }
        const auth = authTokenStore.get();
        if (auth === 'access-new') return jsonResponse({ ok: true });
        return jsonResponse({ message: 'unauthorized' }, { status: 401 });
      });

      const http = createHttpClient({ baseURL: BASE });
      const result = await http.get('/me');

      expect(result).toEqual({ ok: true });
      expect(fetchSpy).toHaveBeenCalledTimes(3); // 첫 호출(401) + refresh + retry = 3번
    });

    test('동시 401에 대해 refresh를 1회만 호출한다 (singleton promise)', async () => {
      authTokenStore.set('access-old');
      let refreshCalls = 0;
      stubFetch(async (url) => {
        if (url.endsWith(REFRESH_PATH)) {
          refreshCalls += 1;
          // race 윈도우를 명확히 만들기 위해 약간 지연
          await new Promise((resolve) => setTimeout(resolve, 10));
          authTokenStore.set('access-new');
          return jsonResponse({ accessToken: 'access-new' });
        }
        const token = authTokenStore.get();
        if (token === 'access-new') return jsonResponse({ ok: true });
        return jsonResponse({ message: 'unauthorized' }, { status: 401 });
      });

      const http = createHttpClient({ baseURL: BASE });
      const [a, b, c] = await Promise.all([
        http.get('/a'),
        http.get('/b'),
        http.get('/c'),
      ]);

      expect(a).toEqual({ ok: true });
      expect(b).toEqual({ ok: true });
      expect(c).toEqual({ ok: true });
      expect(refreshCalls).toBe(1);
    });

    test('재시도 후에도 401이면 재차 retry하지 않고 throw한다 (무한 루프 방지)', async () => {
      authTokenStore.set('access-old');

      let originalCalls = 0;
      stubFetch(async (url) => {
        if (url.endsWith(REFRESH_PATH)) {
          return jsonResponse({ accessToken: 'access-new' });
        }
        originalCalls += 1;
        return jsonResponse({ message: 'still unauthorized' }, { status: 401 });
      });

      const http = createHttpClient({ baseURL: BASE });
      await expect(http.get('/me')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
      });

      expect(originalCalls).toBe(2); // 원본 요청: 최초 호출 + 재시도 1번 = 2번
    });

    test('refresh가 실패하면 onUnauthorized 콜백을 호출하고 원본 401을 throw한다', async () => {
      authTokenStore.set('access-old');
      const onLogout = vi.fn();
      stubFetch(async (url) => {
        if (url.endsWith(REFRESH_PATH)) {
          return new Response('refresh denied', { status: 401 });
        }
        return jsonResponse({ message: 'unauthorized' }, { status: 401 });
      });

      const http = createHttpClient({
        baseURL: BASE,
        onUnauthorized: onLogout,
      });

      await expect(http.get('/me')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
      });
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    test('기본 onUnauthorized는 토큰을 비운다', async () => {
      authTokenStore.set('access-old');
      stubFetch(async (url) => {
        if (url.endsWith(REFRESH_PATH)) {
          return new Response('refresh denied', { status: 401 });
        }
        return jsonResponse({ message: 'unauthorized' }, { status: 401 });
      });

      const http = createHttpClient({ baseURL: BASE });
      await expect(http.get('/me')).rejects.toThrow();
      expect(authTokenStore.get()).toBeNull();
    });

    test('refresh 실패 후 토큰은 빈 문자열이 아니라 null로 비워진다', async () => {
      authTokenStore.set('access-old');
      const onLogout = vi.fn();
      stubFetch(async (url) => {
        if (url.endsWith(REFRESH_PATH)) {
          return new Response('refresh denied', { status: 401 });
        }
        return jsonResponse({ message: 'unauthorized' }, { status: 401 });
      });

      const http = createHttpClient({
        baseURL: BASE,
        onUnauthorized: onLogout,
      });
      await expect(http.get('/me')).rejects.toThrow();

      expect(authTokenStore.get()).toBeNull();
    });
  });

  describe('JSON body 직렬화', () => {
    test('객체 body는 JSON으로 직렬화되고 Content-Type이 자동 설정된다', async () => {
      const fetchSpy = stubFetch(async () => jsonResponse({ ok: true }));

      const http = createHttpClient({ baseURL: BASE });
      await http.post('/photos', { title: '제목' });

      const [, init] = fetchSpy.mock.calls[0];
      expect(init?.body).toBe(JSON.stringify({ title: '제목' }));
      expect(headerOf(init, 'Content-Type')).toBe('application/json');
    });

    test('FormData body는 직렬화하지 않고 Content-Type을 건드리지 않는다', async () => {
      const fetchSpy = stubFetch(async () => jsonResponse({ ok: true }));

      const fd = new FormData();
      fd.append('file', new Blob(['a']), 'a.txt');

      const http = createHttpClient({ baseURL: BASE });
      await http.post('/upload', fd);

      const [, init] = fetchSpy.mock.calls[0];
      expect(init?.body).toBe(fd);
      expect(headerOf(init, 'Content-Type')).toBeNull();
    });
  });

  describe('에러 매핑', () => {
    test('4xx 상태를 ApiError로 변환하고 code를 매핑한다', async () => {
      stubFetch(async () =>
        jsonResponse({ message: 'bad input' }, { status: 422 }),
      );

      const http = createHttpClient({ baseURL: BASE });
      await expect(http.get('/x')).rejects.toMatchObject({
        status: 422,
        code: 'VALIDATION',
        message: 'bad input',
      });
    });

    test('fetch 자체가 throw하면 NETWORK 코드의 ApiError로 감싸 throw한다', async () => {
      stubFetch(async () => {
        throw new TypeError('network down');
      });

      const http = createHttpClient({ baseURL: BASE });
      await expect(http.get('/x')).rejects.toMatchObject({
        code: 'NETWORK',
        status: 0,
      });
    });
  });
});
