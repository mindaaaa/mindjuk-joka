import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/shared/config/env', () => ({
  env: { VITE_API_BASE_URL: 'http://test.local', VITE_APP_VERSION: 'test' },
}));

import { setRoleResolver } from './identity';
import { flush, initAnalytics, resetForTests, track } from './track';

import { albumIdStore } from '@/shared/api/album-id';
import { authTokenStore } from '@/shared/api/auth-token';

const ENDPOINT = 'http://test.local/v1/user-events';
const TOKEN = 'access-token';
const ALBUM_ID = 'album-1';

function mockFetch() {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 204 }));
}

function lastCall(spy: ReturnType<typeof mockFetch>) {
  const calls = spy.mock.calls;
  return calls[calls.length - 1];
}

function bodyOf(spy: ReturnType<typeof mockFetch>) {
  return JSON.parse(lastCall(spy)?.[1]?.body as string);
}

function headersOf(spy: ReturnType<typeof mockFetch>) {
  return lastCall(spy)?.[1]?.headers as Record<string, string>;
}

beforeEach(() => {
  sessionStorage.clear();
  resetForTests();
  authTokenStore.set(TOKEN);
  albumIdStore.set(ALBUM_ID);
  setRoleResolver(() => 'EDITOR');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  authTokenStore.clear();
  albumIdStore.clear();
  setRoleResolver(() => null);
});

describe('track / flush', () => {
  test('flush 시 버퍼된 이벤트를 배치로 전송', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    expect(fetchSpy).not.toHaveBeenCalled();

    flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe(ENDPOINT);
    const payload = bodyOf(fetchSpy);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0].name).toBe('list.view');
  });

  // 서버는 필수 필드가 하나라도 어긋나면 배치 전체를 400으로 버린다
  test('봉투에 서버 필수 필드(name·timestamp·userRole)와 공통 필드 포함', () => {
    const fetchSpy = mockFetch();

    track('detail.view', { source: 'grid' });
    flush();

    const e = bodyOf(fetchSpy).events[0];
    expect(e.name).toBe('detail.view');
    expect(typeof e.timestamp).toBe('number');
    expect(e.userRole).toBe('EDITOR');
    expect(e.sessionId).toBeTruthy();
    expect(e.route).toBeTruthy();
    expect(e.appVersion).toBe('test');
    expect(e.props).toEqual({ source: 'grid' });
  });

  // 서버가 인증·앨범을 헤더로만 받으므로, 빠지면 401/400으로 전량 유실된다
  test('인증 토큰과 앨범 헤더를 실어 전송', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    flush();

    expect(headersOf(fetchSpy)).toMatchObject({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      'X-Album-Id': ALBUM_ID,
    });
  });

  // sendBeacon은 헤더를 실을 수 없어 인증을 못해 헤더를 지원하는 keepalive로 대체
  test('탭이 닫혀도 배달되도록 keepalive로 전송', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    flush();

    expect(fetchSpy.mock.calls[0][1]?.keepalive).toBe(true);
  });

  test('버퍼 임계치(20) 도달 시 자동 전송', () => {
    const fetchSpy = mockFetch();

    // props를 다르게 줘 dedup에 걸리지 않는 서로 다른 이벤트 20개
    for (let i = 0; i < 20; i += 1) track('list.view', { i });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(bodyOf(fetchSpy).events).toHaveLength(20);
  });

  // 정상 유저의 우발적 중복과 코드 버그로 인한 폭주를 걸러, DB·서버리스 호출이 불필요하게 쌓이지 않게 한다
  test('동일 이벤트 연타는 우발적 중복으로 접어 1건만 집계', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    track('list.view');
    track('list.view');
    flush();

    expect(bodyOf(fetchSpy).events).toHaveLength(1);
  });

  test('dedup 창(500ms)이 지나면 같은 이벤트도 다시 집계', () => {
    vi.useFakeTimers();
    const fetchSpy = mockFetch();

    track('list.view');
    vi.advanceTimersByTime(600);
    track('list.view');
    flush();

    expect(bodyOf(fetchSpy).events).toHaveLength(2);
  });

  test('분당 상한(120)을 넘는 폭주는 조용히 드롭', () => {
    const fetchSpy = mockFetch();

    // props를 달리해 dedup은 피하면서 상한 초과를 시도
    for (let i = 0; i < 200; i += 1) track('list.view', { i });
    flush();

    const total = fetchSpy.mock.calls.reduce(
      (n, c) => n + JSON.parse(c[1]?.body as string).events.length,
      0,
    );
    expect(total).toBe(120);
  });

  test('raw 이벤트는 dedup·분당 상한을 모두 건너뛰어 전량 수집', () => {
    const fetchSpy = mockFetch();

    // 동일 props를 150번(상한 120 초과)
    const props = { path: '/v1/photos/:id', method: 'GET', ms: 1, status: 200 };
    for (let i = 0; i < 150; i += 1) track('api.timing', props, { raw: true });
    flush();

    const total = fetchSpy.mock.calls.reduce(
      (n, c) => n + JSON.parse(c[1]?.body as string).events.length,
      0,
    );
    expect(total).toBe(150);
  });

  test('raw 이벤트는 일반 이벤트의 dedup 상태를 오염시키지 않음', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    track('api.timing', { ms: 1 }, { raw: true });
    track('list.view'); // 직전 list.view와 동일 → 여전히 dedup에 걸려야
    flush();

    const events = bodyOf(fetchSpy).events as { name: string }[];
    const listViews = events.filter((e) => e.name === 'list.view');
    expect(listViews).toHaveLength(1);
  });

  test('인터벌 경과 시 자동 flush', () => {
    vi.useFakeTimers();
    const fetchSpy = mockFetch();

    track('list.view');
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  test('빈 버퍼 flush는 아무것도 전송 안 함', () => {
    const fetchSpy = mockFetch();
    flush();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('flush 후 버퍼가 비워져 재전송 안 함', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    flush();
    flush(); // 두 번째는 빈 버퍼라 전송 없어야 함

    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

// 서버는 이벤트를 앨범 스코프로 저장하고 앨범을 헤더 하나로만 받는다.
// 앨범이 다른 이벤트를 한 요청에 섞으면 통계가 엉뚱한 앨범으로 귀속된다.
describe('앨범 귀속', () => {
  test('앨범이 다른 이벤트는 요청을 나눠 각자의 앨범으로 전송', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    albumIdStore.set('album-2');
    track('detail.view');
    flush();

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const sent = fetchSpy.mock.calls.map((c) => ({
      albumId: (c[1]?.headers as Record<string, string>)['X-Album-Id'],
      names: JSON.parse(c[1]?.body as string).events.map(
        (e: { name: string }) => e.name,
      ),
    }));
    expect(sent).toEqual(
      expect.arrayContaining([
        { albumId: ALBUM_ID, names: ['list.view'] },
        { albumId: 'album-2', names: ['detail.view'] },
      ]),
    );
  });

  test('앨범 확정 전 이벤트는 버리지 않고 보류했다가 첫 앨범에 귀속', () => {
    const fetchSpy = mockFetch();
    albumIdStore.clear();

    track('auth.login_success');
    flush();
    expect(fetchSpy).not.toHaveBeenCalled(); // 보낼 앨범이 없으니 아직 보류

    albumIdStore.set(ALBUM_ID);
    track('list.view');
    flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(headersOf(fetchSpy)['X-Album-Id']).toBe(ALBUM_ID);
    expect(
      bodyOf(fetchSpy).events.map((e: { name: string }) => e.name),
    ).toEqual(['auth.login_success', 'list.view']);
  });

  // 서버가 userRole을 필수 enum으로 요구하므로 null이 섞이면 배치 전체가 400으로 버려짐
  test('권한이 끝내 확정되지 않은 이벤트는 배치를 오염시키지 않도록 드롭', () => {
    const fetchSpy = mockFetch();
    setRoleResolver(() => null);

    track('list.view');
    flush();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('토큰이 없으면 전송하지 않고 로그인 이후로 보류', () => {
    const fetchSpy = mockFetch();
    authTokenStore.clear();

    track('api.timing', { ms: 1 }, { raw: true });
    flush();
    expect(fetchSpy).not.toHaveBeenCalled();

    authTokenStore.set(TOKEN);
    flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(bodyOf(fetchSpy).events).toHaveLength(1);
  });
});

describe('initAnalytics', () => {
  test('pagehide·visibilitychange 리스너 등록', () => {
    const winSpy = vi.spyOn(window, 'addEventListener');
    const docSpy = vi.spyOn(document, 'addEventListener');

    initAnalytics();

    expect(winSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));
    expect(docSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });

  test('pagehide 발생 시 flush', () => {
    const fetchSpy = mockFetch();

    initAnalytics();
    track('list.view');

    window.dispatchEvent(new Event('pagehide'));

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe(ENDPOINT);
  });
});
