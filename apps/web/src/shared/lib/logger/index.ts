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
  if (!context) return { layer };
  return {
    layer,
    ...(context.operationId !== null && { operationId: context.operationId }),
    ...(context.mediaState !== null && { mediaState: context.mediaState }),
    ...(context.userRole !== null && { userRole: context.userRole }),
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
  const {
    operationId: _o,
    mediaState: _m,
    userRole: _u,
    ...rest
  } = context ?? {};
  return { ...common, ...rest };
}

/**
 * Sentry 전송을 담당하는 공통 내부 함수
 * @param level Sentry 로그 레벨
 * @param layer 로그 계층
 * @param messageOrError 로그 메시지 또는 에러
 * @param context 로그 컨텍스트
 */
function sendToSentry(
  level: Sentry.SeverityLevel,
  layer: LogLayer,
  messageOrError: string | Error,
  context?: LogContext,
) {
  const payload = buildPayload(layer, context);

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setTag('layer', layer);

    if (context) {
      if (context.operationId !== null) {
        scope.setTag('operationId', String(context.operationId));
      }
      if (context.mediaState !== null) {
        scope.setTag('mediaState', context.mediaState);
      }
    }

    scope.setContext('payload', payload);

    if (messageOrError instanceof Error) {
      Sentry.captureException(messageOrError);
    } else {
      Sentry.captureMessage(messageOrError);
    }
  });
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
    console.log('[expected]', message, buildPayload('expected', context));
  },

  business(message: string, context?: LogContext): void {
    console.log('[business]', message, buildPayload('business', context));
    if (Math.random() < BUSINESS_SAMPLE_RATE) {
      sendToSentry('info', 'business', message, context);
    }
  },

  operational(message: string, context?: LogContext): void {
    console.warn(
      '[operational]',
      message,
      buildPayload('operational', context),
    );
    sendToSentry('warning', 'operational', message, context);
  },

  bug(error: Error, context?: LogContext): void {
    console.error('[bug]', error.message, buildPayload('bug', context));
    sendToSentry('error', 'bug', error, context);
  },
};

export { log };
