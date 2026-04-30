/**
 * 동일 operational 이벤트 fingerprint에 대해 sessionStorage 기준 5분 재전송을 막습니다.
 * bug 계층 등에는 사용하지 않습니다.
 */
export const COOLDOWN_MS = 5 * 60 * 1000;

const STORAGE_KEY = 'joka:monitoring:log_cooldown';

export function isInCooldown(fingerprint: string): boolean {
  const store = pruneExpired(loadExpiresByFingerprint());
  const until = store[fingerprint];
  return until !== undefined && until > Date.now();
}

/** 전송 직후 호출 - fingerprint 기준 COOLDOWN_MS 동안 재전송 방지 */
export function setCooldown(fingerprint: string): void {
  const store = pruneExpired(loadExpiresByFingerprint());
  store[fingerprint] = Date.now() + COOLDOWN_MS;
  persist(store);
}

function loadExpiresByFingerprint(): Record<string, number> {
  if (typeof sessionStorage === 'undefined') {
    return {};
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function pruneExpired(store: Record<string, number>): Record<string, number> {
  const now = Date.now();
  const next: Record<string, number> = {};

  for (const [fp, expiresAt] of Object.entries(store)) {
    if (typeof expiresAt === 'number' && expiresAt > now) {
      next[fp] = expiresAt;
    }
  }
  return next;
}

function persist(store: Record<string, number>): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 할당량/사생활 보호 모드 등에서 저장 실패 시 무시
  }
}
