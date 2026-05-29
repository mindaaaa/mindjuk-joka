import { log } from '@/shared/lib/logger';

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER'
  | 'UNKNOWN';

type ErrorLayer = 'expected' | 'operational' | 'bug';

const STATUS_MAP: Record<number, ApiErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
};

const ERROR_CONFIG: Record<
  ApiErrorCode,
  { layer: ErrorLayer; defaultMessage: string }
> = {
  BAD_REQUEST: { layer: 'expected', defaultMessage: '잘못된 요청입니다.' },
  UNAUTHORIZED: { layer: 'expected', defaultMessage: '인증이 필요합니다.' },
  FORBIDDEN: { layer: 'expected', defaultMessage: '권한이 없습니다.' },
  NOT_FOUND: { layer: 'expected', defaultMessage: '찾을 수 없습니다.' },
  CONFLICT: {
    layer: 'expected',
    defaultMessage: '데이터 충돌이 발생했습니다.',
  },
  VALIDATION: {
    layer: 'expected',
    defaultMessage: '입력값이 올바르지 않습니다.',
  },
  NETWORK: {
    layer: 'operational',
    defaultMessage: '네트워크 연결이 원활하지 않습니다.',
  },
  TIMEOUT: {
    layer: 'operational',
    defaultMessage: '요청 시간이 초과되었습니다.',
  },
  SERVER: {
    layer: 'operational',
    defaultMessage: '서버 내부 오류가 발생했습니다.',
  },
  UNKNOWN: { layer: 'bug', defaultMessage: '알 수 없는 오류가 발생했습니다.' },
};

export function codeFromStatus(status: number): ApiErrorCode {
  if (status >= 500) {
    return 'SERVER';
  }

  return STATUS_MAP[status] ?? 'UNKNOWN';
}

export interface ApiErrorInit {
  status: number;
  code?: ApiErrorCode;
  message?: string;
  payload?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly payload?: unknown;

  constructor(init: ApiErrorInit) {
    const code = init.code ?? codeFromStatus(init.status);
    const message = init.message ?? ERROR_CONFIG[code].defaultMessage;

    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = code;

    if (init.payload !== undefined) {
      this.payload = init.payload;
    }
    if (init.cause !== undefined) {
      this.cause = init.cause;
    }
  }
}

/**
 * ApiError를 적절한 로깅 계층으로 라우팅한다.
 *   - expected: 4xx 정상 흐름 (Sentry 미전송, console만)
 *   - operational: 5xx + 네트워크/타임아웃 (Sentry warning)
 *   - bug: 분류 불가 (Sentry error)
 */
export function reportApiError(
  err: ApiError,
  context?: Record<string, unknown>,
): void {
  const payload = { ...context, status: err.status, code: err.code };
  const { layer } = ERROR_CONFIG[err.code];

  switch (layer) {
    case 'expected':
      log.expected(err.message, payload);
      return;
    case 'operational':
      log.operational(err.message, payload);
      return;
    case 'bug':
      log.bug(err, payload);
      return;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const payload = await readErrorPayload(response);
  return new ApiError({
    status: response.status,
    code: codeFromStatus(response.status),
    message: extractMessage(payload, response.status),
    payload,
  });
}

async function readErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {}

  try {
    return await response.clone().text();
  } catch {}

  return undefined;
}

function extractMessage(payload: unknown, status: number): string {
  if (hasStringMessage(payload)) {
    return payload.message;
  }
  return `HTTP ${status}`;
}

function hasStringMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string'
  );
}
