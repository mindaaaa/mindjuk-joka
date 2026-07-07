import {
  getAnonUserId,
  getSessionId,
  getUserRole,
  routePattern,
} from './identity';
import type { AnalyticsEvent, AnalyticsProps, EventEnvelope } from './types';

import { env } from '@/shared/config/env';

const EVENTS_PATH = '/v1/events';
const MAX_BUFFER = 20;
const FLUSH_INTERVAL_MS = 10_000;

// 우발적 중복 접기 (StrictMode 이중 마운트, 빠른 재렌더 등)
const DEDUP_WINDOW_MS = 500;
// 분당 상한 (렌더 루프 같은 버그 폭주)
const RATE_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_MINUTE = 120;

const buffer: EventEnvelope[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

let lastKey: string | null = null;
let lastKeyAt = 0;

let windowStart = 0;
let windowCount = 0;

export function initAnalytics(): void {
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush(true);
    }
  });
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const now = Date.now();

  const key = `${event}|${routePattern()}|${props ? JSON.stringify(props) : ''}`;
  if (key === lastKey && now - lastKeyAt < DEDUP_WINDOW_MS) {
    return;
  }
  lastKey = key;
  lastKeyAt = now;

  if (now - windowStart >= RATE_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_EVENTS_PER_MINUTE) {
    return;
  }
  windowCount += 1;

  buffer.push(buildEnvelope(event, props));

  if (buffer.length >= MAX_BUFFER) {
    flush();
    return;
  }
  scheduleFlush();
}

function buildEnvelope(
  event: AnalyticsEvent,
  props?: AnalyticsProps,
): EventEnvelope {
  return {
    event,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    anonUserId: getAnonUserId(),
    userRole: getUserRole(),
    route: routePattern(),
    appVersion: env.VITE_APP_VERSION,
    ...(props && { props }),
  };
}

export function flush(useBeacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;

  const events = buffer.splice(0, buffer.length);
  send(events, useBeacon);
}

function scheduleFlush(): void {
  if (timer) return;
  timer = setTimeout(() => flush(), FLUSH_INTERVAL_MS);
}

function send(events: EventEnvelope[], useBeacon: boolean): void {
  const url = `${env.VITE_API_BASE_URL}${EVENTS_PATH}`;
  const body = JSON.stringify({ events });

  if (useBeacon && typeof navigator.sendBeacon === 'function') {
    // sendBeacon은 헤더 설정이 불가능하므로, Content-Type 지정을 위해 데이터 타입 정보가 내장된 Blob으로 감싸 전송
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }

  // 탭이 닫혀도 백그라운드 배달을 보장하는 keepalive 활성화
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function resetForTests(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  buffer.length = 0;
  lastKey = null;
  lastKeyAt = 0;
  windowStart = 0;
  windowCount = 0;
}
