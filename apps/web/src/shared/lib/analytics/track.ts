import {
  getAnonUserId,
  getSessionId,
  getUserRole,
  routePattern,
} from './identity';
import type { AnalyticsEvent, AnalyticsProps, EventEnvelope } from './types';

import type { UserRole } from '@/entities/user';
import { albumIdStore } from '@/shared/api/album-id';
import { authTokenStore } from '@/shared/api/auth-token';
import { env } from '@/shared/config/env';

export interface TrackOptions {
  raw?: boolean;
}

const EVENTS_PATH = '/v1/user-events';
const MAX_BUFFER = 20;
// 서버가 한 요청당 허용하는 이벤트 수(초과 시 배치 전체가 TOO_MANY_EVENTS로 400)
const MAX_EVENTS_PER_REQUEST = 20;
const FLUSH_INTERVAL_MS = 10_000;

// 우발적 중복 접기 (StrictMode 이중 마운트, 빠른 재렌더 등)
const DEDUP_WINDOW_MS = 500;
// 분당 상한 (렌더 루프 같은 버그 폭주)
const RATE_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_MINUTE = 120;

/** 전송 대기 이벤트
 * - 이벤트가 쌓인 시점의 앨범을 기억해뒀다가 앨범별로 나눠 보냄
 * - albumId가 null이면 첫 앨범 확정 시 귀속됨 */
interface PendingEvent {
  albumId: string | null;
  envelope: Omit<EventEnvelope, 'userRole'> & { userRole: UserRole | null };
}

const buffer: PendingEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

let lastKey: string | null = null;
let lastKeyAt = 0;

let windowStart = 0;
let windowCount = 0;

export function initAnalytics(): void {
  window.addEventListener('pagehide', () => flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });
}

export function track(
  event: AnalyticsEvent,
  props?: AnalyticsProps,
  options?: TrackOptions,
): void {
  const now = Date.now();

  // raw 계측 이벤트는 dedup을 건너뛰고 lastKey도 오염시키지 않음
  if (!options?.raw) {
    const key = `${event}|${routePattern()}|${props ? JSON.stringify(props) : ''}`;
    if (key === lastKey && now - lastKeyAt < DEDUP_WINDOW_MS) {
      return;
    }
    lastKey = key;
    lastKeyAt = now;
  }

  // raw 계측 이벤트는 분당 상한 건너뜀
  if (!options?.raw && consumeRateLimit(now)) {
    return;
  }

  buffer.push({
    albumId: albumIdStore.get(),
    envelope: buildEnvelope(event, props),
  });

  if (buffer.length >= MAX_BUFFER) {
    flush();
    // 아직 전송할 수 없는(앨범·토큰 미확정) 이벤트는 flush 후에도 남는다.
    if (buffer.length > MAX_BUFFER) {
      buffer.splice(0, buffer.length - MAX_BUFFER);
    }
    return;
  }
  scheduleFlush();
}

function consumeRateLimit(now: number): boolean {
  if (now - windowStart >= RATE_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_EVENTS_PER_MINUTE) {
    return true;
  }
  windowCount += 1;
  return false;
}

function buildEnvelope(
  event: AnalyticsEvent,
  props?: AnalyticsProps,
): PendingEvent['envelope'] {
  return {
    name: event,
    timestamp: Date.now(),
    userRole: getUserRole(),
    sessionId: getSessionId(),
    anonUserId: getAnonUserId(),
    route: routePattern(),
    appVersion: env.VITE_APP_VERSION,
    ...(props && { props }),
  };
}

/**
 * 전송 가능한 이벤트만 앨범별로 묶어 보내고, 아직 보낼 수 없는 이벤트는 버퍼에 남긴다.
 *
 * 전송 조건은 인증 토큰과 앨범이 모두 확정되는 것이다. 서버가 두 값을 헤더로 요구하기 때문이다.
 */
export function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;

  const token = authTokenStore.get();
  // 로그인 완료 후 함께 보내도록 버퍼에 남긴다
  if (!token) return;

  const currentAlbumId = albumIdStore.get();
  const byAlbum = new Map<string, EventEnvelope[]>();
  const pending: PendingEvent[] = [];

  for (const event of buffer) {
    // 앨범 확정 전에 쌓인 이벤트는 첫 앨범에 귀속시킨다
    const albumId = event.albumId ?? currentAlbumId;
    if (!albumId) {
      pending.push(event);
      continue;
    }

    const userRole = event.envelope.userRole ?? getUserRole();
    if (!userRole) continue;

    const events = byAlbum.get(albumId) ?? [];
    events.push({ ...event.envelope, userRole });
    byAlbum.set(albumId, events);
  }

  buffer.length = 0;
  buffer.push(...pending);

  for (const [albumId, events] of byAlbum) {
    for (let i = 0; i < events.length; i += MAX_EVENTS_PER_REQUEST) {
      send(albumId, token, events.slice(i, i + MAX_EVENTS_PER_REQUEST));
    }
  }
}

function scheduleFlush(): void {
  if (timer) return;
  timer = setTimeout(() => flush(), FLUSH_INTERVAL_MS);
}

function send(albumId: string, token: string, events: EventEnvelope[]): void {
  // keepalive는 헤더를 지원하면서 탭이 닫혀도 백그라운드 배달을 보장
  void fetch(`${env.VITE_API_BASE_URL}${EVENTS_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Album-Id': albumId,
    },
    body: JSON.stringify({ events }),
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
