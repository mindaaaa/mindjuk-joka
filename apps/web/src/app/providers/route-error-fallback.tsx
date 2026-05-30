import { useEffect } from 'react';
import {
  isRouteErrorResponse,
  useNavigate,
  useRevalidator,
  useRouteError,
} from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

import { log } from '@/shared/lib/logger';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

const STATUS_MESSAGE: Record<number, string> = {
  403: '접근 권한이 없어요',
  404: '페이지를 찾을 수 없어요',
  500: '서버에 문제가 생겼어요',
};

interface RouteErrorFallbackProps {
  backTo?: string;
}

export function RouteErrorFallback({ backTo = '/' }: RouteErrorFallbackProps) {
  const error = useRouteError();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

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

  const title = isRouteErrorResponse(error)
    ? (STATUS_MESSAGE[error.status] ?? '요청을 처리하지 못했어요')
    : '이 페이지를 불러오지 못했어요';

  const isRevalidating = revalidator.state === 'loading';

  return (
    <section className="mx-auto max-w-2xl p-6">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>잠시 후 다시 시도해 주세요.</AlertDescription>
      </Alert>

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          disabled={isRevalidating}
          onClick={() => revalidator.revalidate()}
        >
          {isRevalidating ? '다시 시도 중…' : '다시 시도'}
        </Button>

        <Button variant="ghost" onClick={() => navigate(backTo)}>
          나가기
        </Button>
      </div>
    </section>
  );
}
