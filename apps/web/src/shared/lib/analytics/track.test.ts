import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/shared/config/env', () => ({
  env: { VITE_API_BASE_URL: 'http://test.local', VITE_APP_VERSION: 'test' },
}));

import { flush, initAnalytics, resetForTests, track } from './track';

const ENDPOINT = 'http://test.local/v1/events';

function mockFetch() {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 204 }));
}

function lastFetchBody(spy: ReturnType<typeof mockFetch>) {
  const calls = spy.mock.calls;
  const init = calls[calls.length - 1]?.[1];
  return JSON.parse(init?.body as string);
}

beforeEach(() => {
  sessionStorage.clear();
  resetForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('track / flush', () => {
  test('flush 시 버퍼된 이벤트를 배치로 전송', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    expect(fetchSpy).not.toHaveBeenCalled();

    flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe(ENDPOINT);
    const payload = lastFetchBody(fetchSpy);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0].event).toBe('list.view');
  });

  test('봉투에 공통 필드 포함', () => {
    const fetchSpy = mockFetch();

    track('detail.view', { source: 'grid' });
    flush();

    const e = lastFetchBody(fetchSpy).events[0];
    expect(e.sessionId).toBeTruthy();
    expect(e.route).toBeTruthy();
    expect(e.appVersion).toBe('test');
    expect(e.props).toEqual({ source: 'grid' });
    expect(typeof e.timestamp).toBe('number');
  });

  test('버퍼 임계치(20) 도달 시 자동 전송', () => {
    const fetchSpy = mockFetch();

    // props를 다르게 줘 dedup에 걸리지 않는 서로 다른 이벤트 20개
    for (let i = 0; i < 20; i += 1) track('list.view', { i });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(lastFetchBody(fetchSpy).events).toHaveLength(20);
  });

  // 정상 유저의 우발적 중복과 코드 버그로 인한 폭주를 걸러, DB·서버리스 호출이 불필요하게 쌓이지 않게 한다
  test('동일 이벤트 연타는 우발적 중복으로 접어 1건만 집계', () => {
    const fetchSpy = mockFetch();

    track('list.view');
    track('list.view');
    track('list.view');
    flush();

    expect(lastFetchBody(fetchSpy).events).toHaveLength(1);
  });

  test('dedup 창(500ms)이 지나면 같은 이벤트도 다시 집계', () => {
    vi.useFakeTimers();
    const fetchSpy = mockFetch();

    track('list.view');
    vi.advanceTimersByTime(600);
    track('list.view');
    flush();

    expect(lastFetchBody(fetchSpy).events).toHaveLength(2);
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

    const events = lastFetchBody(fetchSpy).events as { event: string }[];
    const listViews = events.filter((e) => e.event === 'list.view');
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

  test('useBeacon=true면 fetch 대신 sendBeacon 사용', () => {
    const fetchSpy = mockFetch();
    const beacon = vi.fn((_url: string, _body?: BodyInit) => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });

    track('auth.logout');
    flush(true);

    expect(beacon).toHaveBeenCalledOnce();
    expect(beacon.mock.calls[0][0]).toBe(ENDPOINT);
    expect(fetchSpy).not.toHaveBeenCalled();
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

  test('pagehide 발생 시 beacon으로 flush', () => {
    const beacon = vi.fn((_url: string, _body?: BodyInit) => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });

    initAnalytics();
    track('list.view');

    window.dispatchEvent(new Event('pagehide'));

    expect(beacon).toHaveBeenCalledOnce();
    expect(beacon.mock.calls[0][0]).toBe(ENDPOINT);
  });
});
