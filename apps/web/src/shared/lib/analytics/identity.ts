import type { UserRole } from '@/entities/user';

const SESSION_KEY = 'joka.sid';
const ANON_ID_LENGTH = 16;

let anonUserId: string | null = null;
let roleResolver: () => UserRole | null = () => null;

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }

  return id;
}

export async function setAnalyticsUser(userId: string | null): Promise<void> {
  anonUserId = userId ? await sha256hex(userId) : null;
}

export function getAnonUserId(): string | null {
  return anonUserId;
}

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, ANON_ID_LENGTH);
}

/**
 * 앨범별 유저 권한(UserRole)을 동적으로 가져오는 함수를 주입합니다.
 * - 앱 초기화 시점(app 레이어)에서 이 함수를 통해 album store의 권한 조회 로직을 주입받아 의존성을 역전합니다.
 * - Note: 유저 권한은 머무르는 앨범에 따라 실시간으로 변하므로, 이벤트가 전송(emit)되는 순간에 이 함수를 실행해 최신 값을 읽어옵니다.
 */
export function setRoleResolver(resolver: () => UserRole | null): void {
  roleResolver = resolver;
}

export function getUserRole(): UserRole | null {
  return roleResolver();
}

/**
 * 분석 통계 그룹화를 위해 실제 URL 경로를 라우트 패턴으로 정규화합니다.
 * @example
 * /photos/abc, /photos/123 ➔ '/photos/:id'
 */
export function routePattern(
  pathname: string = window.location.pathname,
): string {
  if (/^\/photos\/[^/]+$/.test(pathname)) {
    return '/photos/:id';
  }
  return pathname;
}
