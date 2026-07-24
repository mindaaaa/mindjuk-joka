import { ApiError, reportApiError } from './error';

/**
 * 응답 검증 스키마
 * - zod 스키마가 구조적으로 만족하므로 client는 zod에 직접 의존하지 않는다.
 */
export interface ResponseSchema<T> {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: unknown[] } };
}

/**
 * 응답이 API 계약(OpenAPI 스펙)과 다르면 계약 위반(CONTRACT)으로 다룬다.
 * - HTTP 자체는 성공(2xx)이므로 실제 status를 그대로 싣고, 성격은 code로 구분한다.
 * - 사용자 문구·재시도 정책은 code로 분기된다.
 */
export function validate<T>(
  data: unknown,
  schema: ResponseSchema<T>,
  url: string,
  status: number,
): T {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }

  const err = new ApiError({ status, code: 'CONTRACT' });
  reportApiError(err, {
    url,
    schemaViolation: true,
    issues: parsed.error.issues,
  });
  throw err;
}
