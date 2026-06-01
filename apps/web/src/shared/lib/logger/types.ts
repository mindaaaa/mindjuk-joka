import type { LogLayer, MediaState } from '@/shared/types/monitoring';

export type { LogLayer, MediaState };

/** 모든 로그에 공통으로 포함되는 컨텍스트 */
export interface LogContext {
  operationId?: string;
  mediaState?: MediaState;
  userRole?: string;
  standardMessage?: string;
  [key: string]: unknown;
}

/** 이벤트 페이로드에 항상 들어가는 공통 필드 */
export interface CommonFields {
  layer: LogLayer;
  operationId?: string;
  mediaState?: MediaState;
  userRole?: string;
}
