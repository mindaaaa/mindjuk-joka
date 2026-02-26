import * as Sentry from '@sentry/react';

import { CONFIRM_GRACE_MS } from './constants.ts';

import { log } from '@/shared/lib/logger';
import type { MediaState } from '@/shared/types/monitoring';

/** 업로드 시작 시 breadcrumb만 기록 (Sentry 전송 아님) */
export function recordUploadStarted(mediaId: string): void {
  Sentry.addBreadcrumb({
    category: 'upload',
    message: 'upload_started',
    data: { mediaId },
  });
}

/** confirm 4xx/5xx 시 operational 로그 전송 */
export function recordConfirmFailed(mediaId: string): void {
  log.operational('OP|upload|confirm_failed', {
    mediaState: 'PREPARING',
    operationId: 'confirmMedia',
    mediaId,
  });
}

/** COMPLETE 상태에서 upload-urls 재호출 시 bug 로그 전송 */
export function recordUploadUrlsStateViolation(
  mediaId: string,
  currentState: MediaState,
): void {
  log.bug(new Error('STATE_TRANSITION_INVALID'), {
    operationId: 'createUploadUrls',
    mediaState: currentState,
    mediaId,
  });
}

/**
 * 업로드 시작 후 confirm 미호출 30초 경과 시 operational 로그 예약.
 * @returns cancel 함수 (confirm 호출 시 호출하여 타이머 해제)
 */
export function scheduleNotCompletedCheck(mediaId: string): () => void {
  const timeoutId = window.setTimeout(() => {
    log.operational('OP|upload|not_completed', {
      mediaId,
      mediaState: 'PREPARING',
    });
  }, CONFIRM_GRACE_MS);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

/**
 * Media 업로드 프로세스의 상태 전이를 추적하고 이상 징후를 로깅합니다.
 * @param mediaId 업로드 미디어 ID
 * @returns 업로드 흐름 관리 객체
 */
export function createMediaUploadFlow(mediaId: string) {
  let cancelTimer: (() => void) | null = null;

  const stopTracking = () => {
    cancelTimer?.();
    cancelTimer = null;
  };

  return {
    /** 업로드 URL 요청 시 상태 검증 및 추적 시작 */
    onUploadUrlsRequest(state: MediaState): void {
      if (state === 'COMPLETE') {
        return recordUploadUrlsStateViolation(mediaId, state);
      }

      stopTracking();
      recordUploadStarted(mediaId);
      cancelTimer = scheduleNotCompletedCheck(mediaId);
    },

    /** Confirm API 결과에 따른 로그 기록 및 타이머 종료 */
    onConfirmDone(success: boolean): void {
      stopTracking();
      if (!success) recordConfirmFailed(mediaId);
    },

    /** 컴포넌트 언마운트 시 리소스 해제 */
    destroy: stopTracking,
  };
}
