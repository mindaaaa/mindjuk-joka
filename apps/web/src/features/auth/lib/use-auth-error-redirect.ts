import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { isAuthRedirectError } from '@/shared/lib/error-fallback';

import { useAuthStore } from '../model/store';

const LOGIN_PATH = '/login';

/**
 * 401/403이면 에러 풀백 대신 로그인으로 replace 리다이렉트한다.
 * - auth store `reset`(토큰 클리어)을 함께 태워 로그아웃과 일관 처리.
 * - 이미 로그인 화면이면 무한 리다이렉트 방지로 스킵.
 *
 * @returns 리다이렉트가 트리거되면 `true` → 호출부는 풀백 UI 대신 `null`을 렌더.
 */
export function useAuthErrorRedirect(error: unknown): boolean {
  const navigate = useNavigate();
  const location = useLocation();
  const reset = useAuthStore((s) => s.reset);

  const shouldRedirect =
    isAuthRedirectError(error) && location.pathname !== LOGIN_PATH;

  useEffect(() => {
    if (!shouldRedirect) return;
    reset();
    navigate(LOGIN_PATH, {
      replace: true,
      state: { from: location.pathname },
    });
  }, [shouldRedirect, reset, navigate, location.pathname]);

  return shouldRedirect;
}
