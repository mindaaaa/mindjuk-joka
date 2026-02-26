import * as Sentry from '@sentry/react';

import { BUSINESS_SAMPLE_RATE } from './constants.ts';
import { LogLayer, LogContext, CommonFields } from './types.ts';

/**
 * 공통 필드를 가져오는 함수
 * @param layer 로그 계층
 * @param context 로그 컨텍스트
 * @returns 공통 필드
 */
function getCommonFields(layer: LogLayer, context?: LogContext): CommonFields {
  if (!context) {
    return { layer };
  }

  return {
    layer,
    ...(context?.operationId !== null && { operationId: context.operationId }),
    ...(context?.mediaState !== null && { mediaState: context.mediaState }),
    ...(context?.userRole !== null && { userRole: context.userRole }),
  };
}

/**
 * 로그 페이로드를 생성하는 함수
 * @param layer 로그 계층
 * @param context 로그 컨텍스트
 * @returns 로그 페이로드
 */
function buildPayload(
  layer: LogLayer,
  context?: LogContext,
): Record<string, unknown> {
  const common = getCommonFields(layer, context);
  const { _operationId, _mediaState, _userRole, ...rest } = context ?? {};

  return { ...common, ...rest };
}

/**
 * 4계층 로그 레벨로 Sentry 전송 정책을 분리합니다.
 * - expected: 정상 흐름, console만 (Sentry 미전송)
 * - business: UX 지표, Sentry 샘플링 전송
 * - operational: 프로세스 이슈, Sentry 조건부 전송
 * - bug: 예외/로직 위반, Sentry 무조건 captureException
 */
const log = {
  expected(message: string, context?: LogContext): void {
    const payload = buildPayload('expected', context);
    console.log('[expected]', message, payload);
  },

  business(message: string, context?: LogContext): void {
    const payload = buildPayload('business', context);
    console.log('[business]', message, payload);

    if (Math.random() < BUSINESS_SAMPLE_RATE) {
      Sentry.withScope((scope) => {
        scope.setContext('payload', payload);
        Sentry.captureMessage(message, 'info');
      });
    }
  },

  operational(message: string, context?: LogContext): void {
    const payload = buildPayload('operational', context);
    console.warn('[operational]', message, payload);

    Sentry.withScope((scope) => {
      scope.setContext('payload', payload);
      Sentry.captureMessage(message, 'warning');
    });
  },

  bug(error: Error, context?: LogContext): void {
    const payload = buildPayload('bug', context);
    console.error('[bug]', error.message, payload);

    Sentry.withScope((scope) => {
      scope.setContext('payload', payload);
      Sentry.captureException(error);
    });
  },
};

export { log };
