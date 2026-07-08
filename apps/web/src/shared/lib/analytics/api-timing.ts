import { track } from './track';

// API 경로의 UUID·숫자 세그먼트를 :id로 정규화
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function apiPathPattern(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => (UUID_RE.test(seg) || /^\d+$/.test(seg) ? ':id' : seg))
    .join('/');
}

/**
 * API 호출 1건의 소요시간을 자체 이벤트 파이프라인으로 전량 수집한다.
 *
 * - path는 정규화하여 개인정보(원본 ID)를 배제하고 통계 그룹 키로만 사용.
 * - bypassRateLimit: 분당 상한에 걸려 계측이 유실되지 않도록 예외 처리.
 */
export function trackApiTiming(
  url: string,
  method: string,
  durationMs: number,
  status: number,
): void {
  let path: string;
  try {
    path = apiPathPattern(new URL(url).pathname);
  } catch {
    path = url;
  }

  track(
    'api.timing',
    { path, method, ms: Math.round(durationMs), status },
    { bypassRateLimit: true },
  );
}
