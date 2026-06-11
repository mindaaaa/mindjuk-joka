import { QueryCache, QueryClient } from '@tanstack/react-query';

import { MAX_RETRY_COUNT } from './constants';

import { ApiError } from '@/shared/api/error';
import { recordNetworkRetryExceeded } from '@/shared/lib/business-ux-logging';
import { log } from '@/shared/lib/logger';

const RETRYABLE_CLIENT_ERRORS = new Set([408, 429]); // 타임아웃, 레이트리밋

// 4xx는 재요청해도 결과가 같다 → 재시도 안 함(408·429만 일시적이라 예외)
function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    const { status } = error;
    if (status >= 400 && status < 500) {
      return RETRYABLE_CLIENT_ERRORS.has(status);
    }
  }
  return true; // 5xx·네트워크 등은 재시도
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    /** 모든 React Query 에러(Queries & Mutations)를 bug 계층으로 전송 */
    onError: (error, query) => {
      const operationId = query.meta?.operationId as string | undefined;
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));

      if (operationId) {
        log.bug(errorInstance, { operationId });
      } else {
        log.bug(errorInstance);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (!isRetryable(error)) return false;

        if (failureCount === MAX_RETRY_COUNT) {
          recordNetworkRetryExceeded({
            retryCount: failureCount,
            operationId: 'query_retry_limit',
          });
        }
        return failureCount < MAX_RETRY_COUNT;
      },

      throwOnError: true,
    },
  },
});
