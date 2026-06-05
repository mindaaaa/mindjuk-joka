import { useEffect } from 'react';
import {
  isRouteErrorResponse,
  useNavigate,
  useRevalidator,
  useRouteError,
} from 'react-router-dom';

import { useAuthErrorRedirect } from '@/features/auth';
import { errorFallbackMessage } from '@/shared/lib/error-fallback';
import { log } from '@/shared/lib/logger';
import { ErrorState } from '@/shared/ui/error-state';

interface RouteErrorFallbackProps {
  backTo?: string;
}

/** 돌아갈 위치에 맞춘 보조 액션 라벨 */
function exitLabel(backTo: string): string {
  if (backTo === '/login') return '로그인으로';
  return '처음으로';
}

export function RouteErrorFallback({ backTo = '/' }: RouteErrorFallbackProps) {
  const error = useRouteError();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const redirecting = useAuthErrorRedirect(error);

  useEffect(() => {
    if (isRouteErrorResponse(error)) {
      log.expected(`라우트 응답 에러 ${error.status}`, {
        operationId: 'route_error_response',
        status: error.status,
      });
      return;
    }

    const instance = error instanceof Error ? error : new Error(String(error));
    log.bug(instance, { operationId: 'route_error' });
  }, [error]);

  // 401/403은 로그인으로 리다이렉트 중 → 풀백 깜빡임 방지로 렌더 생략.
  if (redirecting) return null;

  const isRevalidating = revalidator.state === 'loading';

  return (
    <ErrorState
      fill="screen"
      title="페이지를 불러오지 못했어요"
      description={errorFallbackMessage(error)}
      retry={{
        label: '다시 시도',
        pending: isRevalidating,
        onClick: () => revalidator.revalidate(),
      }}
      secondary={{
        label: exitLabel(backTo),
        onClick: () => navigate(backTo),
      }}
    />
  );
}
