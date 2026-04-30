import type { LogLayer, MediaState } from '@/shared/types/monitoring';

/** Sentry 이벤트에 설정하는 tag 키 (beforeSend/로거 연동) */
export interface SentryTagKeys {
  layer: LogLayer;
  operationId?: string;
  mediaState?: MediaState;
}

export type SentryTagLayer = LogLayer;
