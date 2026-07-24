import { ApiError } from '@/shared/api/error';

/**
 * 에러 종류에 맞는 풀백 안내 문구를 돌려준다.
 * - status/code 분기를 한 곳에 모아 풀백 컴포넌트들이 공유한다.
 */
export function errorFallbackMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // 계약 위반은 재시도가 무의미하므로 → 재시도 뉘앙스 없이 담백하게 알림
    if (error.code === 'CONTRACT') return '어라, 뭔가 안 맞아요. 곧 고칠게요';

    const isNetworkError =
      error.code === 'NETWORK' ||
      error.code === 'TIMEOUT' ||
      error.status === 0;
    const isServerError = error.status >= 500 || error.code === 'SERVER';

    if (isNetworkError) return '인터넷 연결을 확인해 주세요';
    if (isServerError) return '일시적인 문제가 발생했어요';
  }

  return '잠시 후 다시 시도해 주세요';
}

/**
 * 인증 만료(401)·권한 없음(403) 여부
 * - `true`면 풀백 대신 로그인 리다이렉트 대상
 */
export function isAuthRedirectError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
