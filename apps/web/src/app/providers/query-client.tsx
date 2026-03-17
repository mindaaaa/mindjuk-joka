import { QueryCache, QueryClient } from '@tanstack/react-query';

import { MAX_RETRY_COUNT } from './constants';

import { recordNetworkRetryExceeded } from '@/shared/lib/business-ux-logging';
import { log } from '@/shared/lib/logger';

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
      retry: (failureCount) => {
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
