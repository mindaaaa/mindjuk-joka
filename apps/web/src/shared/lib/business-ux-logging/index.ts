/**
 * Business Impact (UX 품질) 로그
 *
 * 사용자 체감 품질 저하를 수집하는 business 계층 로그.
 * Sentry 전송은 sentry.policy에서 10% 샘플링 적용.
 *
 * 대상
 * 1) GET /media 응답 2000ms 초과
 * 2) 403 (VIEWER 수정 시도 등)
 * 3) 네트워크 재시도 3회 이상
 */
import { MEDIA_LIST_SLOW_THRESHOLD_MS } from './constants';

import { log } from '@/shared/lib/logger';

/** GET /media 응답이 2초 초과했을 때 호출 */
export function recordMediaListSlow(
  duration: number,
  operationId = 'listMedia',
): void {
  if (duration <= MEDIA_LIST_SLOW_THRESHOLD_MS) return;

  log.business('UX|media_list|slow', {
    duration,
    operationId,
  });
}

/** 403 발생 시 호출 (VIEWER가 수정 시도 등) */
export function recordForbidden(context: {
  userRole: string;
  operationId?: string;
}): void {
  log.business('UX|forbidden|viewer_edit_attempt', {
    userRole: context.userRole,
    operationId: context.operationId ?? 'updateMedia',
  });
}

/** 네트워크 재시도 3회 이상 시 호출 */
export function recordNetworkRetryExceeded(
  context: {
    operationId?: string;
    retryCount?: number;
  } = {},
): void {
  const { operationId = 'unknown', retryCount } = context;

  const payload: Record<string, unknown> = {};

  if (operationId) {
    payload.operationId = operationId;
  }

  // null과 undefined를 모두 안전하게 제외하고 전달
  if (retryCount !== null) {
    payload.retryCount = retryCount;
  }

  log.business('UX|network|retry_exceeded', payload);
}
