import {
  attachJokaStandardContext,
  normalizeMonitoringTags,
} from './joka-standard-event.ts';
import {
  BUSINESS_SAMPLE_RATE,
  OPERATIONAL_ALLOWLIST,
} from './sentry.constants.ts';

/** beforeSend에 넘길 이벤트 형태 (tags, message, fingerprint만 사용) */
export interface SentryEventLike {
  tags?: Record<string, unknown>;
  message?: unknown;
  fingerprint?: string[];
}

/**
 * layer 기반 필터 적용. fingerprint(operationId, mediaState) 설정.
 * @returns 전송 시 event, drop 시 null
 */
export function applyBeforeSendFilter<T extends SentryEventLike>(
  event: T,
): T | null {
  const layer = event.tags?.layer as string | undefined;

  if (layer === 'expected') {
    return null;
  }
  if (layer === 'business' && Math.random() > BUSINESS_SAMPLE_RATE) {
    return null;
  }

  if (layer === 'operational') {
    const message = getEventMessage(event);
    const isAllowedMessage =
      message &&
      OPERATIONAL_ALLOWLIST.includes(
        message as (typeof OPERATIONAL_ALLOWLIST)[number],
      );

    if (!isAllowedMessage) {
      return null;
    }
  }

  const fingerprints = getFingerprint(event.tags);
  if (fingerprints.length > 0) {
    event.fingerprint = fingerprints;
  }

  normalizeMonitoringTags(event);
  attachJokaStandardContext(event);

  return event;
}

/**
 * Sentry 이벤트 메시지를 가져오는 함수
 * @param event Sentry 이벤트
 * @returns 이벤트 메시지
 */
function getEventMessage(event: SentryEventLike): string | undefined {
  const msg = event.message;
  if (typeof msg === 'string') return msg;

  if (msg && typeof msg === 'object' && 'formatted' in msg) {
    return (msg as Record<string, unknown>).formatted as string | undefined;
  }

  return undefined;
}

/**
 * 로그의 지문(Fingerprint)을 생성합니다.
 * operationId와 mediaState를 조합하여 Sentry 이슈 그룹화 기준을 정의합니다.
 */
function getFingerprint(tags?: SentryEventLike['tags']): string[] {
  if (!tags) return [];

  const { operationId, mediaState } = tags;

  return [operationId, mediaState].filter(
    (value): value is string => typeof value === 'string',
  );
}
