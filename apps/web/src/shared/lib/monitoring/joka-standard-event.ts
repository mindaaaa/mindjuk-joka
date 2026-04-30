/**
 * Sentry → n8n → Gemini 파이프라인용 단일 JSON 형태.
 */
export interface JokaStandardEvent {
  layer: string;
  operationId: string;
  mediaState: string;
  userRole: string;
  message: string;
  fingerprint: string[];
  /** bug 계층만 */
  stack?: string;
}

const CONTEXT_KEY = 'joka_standard';

export function normalizeMonitoringTags(event: {
  tags?: Record<string, unknown>;
}): void {
  const t = event.tags ?? {};
  event.tags = {
    ...t,
    layer: String(t.layer ?? 'unknown'),
    operationId: String(t.operationId ?? 'unknown'),
    mediaState: String(t.mediaState ?? 'unknown'),
    userRole: String(t.userRole ?? 'unknown'),
  };
}

/**
 * Sentry 이벤트에 Joka Standard Context를 추가합니다.
 * @param event Sentry 이벤트
 */
export function attachJokaStandardContext(event: {
  tags?: Record<string, unknown>;
  message?: unknown;
  fingerprint?: string[];
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          function?: string;
          filename?: string;
          lineno?: number;
        }>;
      };
    }>;
  };
  contexts?: Record<string, unknown>;
}): void {
  const tags = event.tags ?? {};
  const layer = String(tags.layer ?? 'unknown');
  const operationId = String(tags.operationId ?? 'unknown');
  const mediaState = String(tags.mediaState ?? 'unknown');
  const userRole = String(tags.userRole ?? 'unknown');

  const message = resolveStandardMessage(
    event.exception !== undefined
      ? {
          message: event.message,
          contexts: event.contexts ?? {},
          exception: event.exception,
        }
      : {
          message: event.message,
          contexts: event.contexts ?? {},
        },
  );

  const fingerprint =
    event.fingerprint && event.fingerprint.length > 0
      ? [...event.fingerprint]
      : [operationId, mediaState];

  const payload: JokaStandardEvent = {
    layer,
    operationId,
    mediaState,
    userRole,
    message,
    fingerprint,
  };

  if (layer === 'bug') {
    payload.stack = formatExceptionStack(event);
  }

  const prev = event.contexts ?? {};
  event.contexts = {
    ...prev,
    [CONTEXT_KEY]: { ...payload },
  };
}

function getEventMessageString(event: { message?: unknown }): string {
  const msg = event.message;

  if (typeof msg === 'string') {
    return msg;
  }
  if (msg && typeof msg === 'object' && 'formatted' in msg) {
    return String((msg as Record<string, unknown>).formatted ?? '');
  }

  return '';
}

/**
 * Sentry 이벤트의 첫 예외를 `타입: 메시지` 한 줄로 요약합니다.
 *
 * @example
 * ```ts
 * summarizeException({
 *   exception: { values: [{ type: 'TypeError', value: "Cannot read properties of undefined (reading 'x')" }] },
 * });
 * // => "TypeError: Cannot read properties of undefined (reading 'x')"
 * ```
 */
function summarizeException(event: {
  exception?: {
    values?: Array<{ type?: string; value?: string }>;
  };
}): string {
  const v = event.exception?.values?.[0];
  if (!v) {
    return '';
  }

  return `${v.type ?? 'Error'}: ${v.value ?? ''}`;
}

/**
 * bug 이벤트에서 쓰는 문자열입니다.
 * 스택이 없으면 예외 한 줄만 반환합니다.
 *
 * @example `Error: fail\n    at outer (app.ts:10)\n    at inner (app.ts:3)`
 */
function formatExceptionStack(event: {
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          function?: string;
          filename?: string;
          lineno?: number;
        }>;
      };
    }>;
  };
}): string {
  const v = event.exception?.values?.[0];
  if (!v) {
    return '';
  }

  const frames = v.stacktrace?.frames;
  if (frames?.length) {
    const lines = [...frames]
      .reverse()
      .map(
        (f) =>
          `    at ${f.function || '?'} (${f.filename ?? '?'}:${f.lineno ?? 0})`,
      );
    return `${v.type ?? 'Error'}: ${v.value ?? ''}\n${lines.join('\n')}`;
  }

  return `${v.type ?? 'Error'}: ${v.value ?? ''}`;
}

/**
 * 표준 메시지(`joka_standard.message`)를 정합니다.
 * 적용 순서
 * 1. `contexts.payload.standardMessage` — 로거에서 지정한 문구
 * 2. 이벤트 메시지 — `captureMessage` 등
 * 3. 예외 요약 — `타입: 메시지` 한 줄
 * @param event Sentry 이벤트
 * @returns Sentry 이벤트의 메시지를 표준화한 문자열
 */
function resolveStandardMessage(event: {
  message?: unknown;
  contexts?: Record<string, unknown>;
  exception?: {
    values?: Array<{ type?: string; value?: string }>;
  };
}): string {
  const payload = event.contexts?.payload as
    | Record<string, unknown>
    | undefined;

  const fromPayload =
    typeof payload?.standardMessage === 'string' ? payload.standardMessage : '';

  return (
    fromPayload || getEventMessageString(event) || summarizeException(event)
  );
}
