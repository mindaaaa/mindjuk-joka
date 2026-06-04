import { Component, type ErrorInfo, type ReactNode } from 'react';

import { errorFallbackMessage } from '@/shared/lib/error-fallback';
import { log } from '@/shared/lib/logger';
import { ErrorState } from '@/shared/ui/error-state';

interface Props {
  children: ReactNode;
  /** 정적 노드 또는 잡은 에러를 받아 렌더하는 함수형 풀백. */
  fallback?: ReactNode | ((error: Error) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 전역 ErrorBoundary
 * - 렌더링 예외를 포착해 bug 계층으로 전송한다.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    log.bug(error, {
      componentStack: info.componentStack ?? 'No component stack available',
    });
  }

  // 컴포넌트 마운트 시 비동기 처리되지 않은 에러를 추적
  override componentDidMount(): void {
    window.addEventListener('unhandledrejection', this.handlePromiseError);
  }

  override componentWillUnmount(): void {
    window.removeEventListener('unhandledrejection', this.handlePromiseError);
  }

  private handlePromiseError = (event: PromiseRejectionEvent): void => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    log.bug(error, { operationId: 'unhandled_promise_rejection' });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const error = this.state.error ?? new Error('알 수 없는 렌더링 에러');

      if (typeof fallback === 'function') return fallback(error);
      if (fallback !== undefined) return fallback;

      return (
        <ErrorState
          fill="screen"
          title="페이지를 불러오지 못했어요"
          description={errorFallbackMessage(error)}
          retry={{
            label: '다시 시도',
            onClick: () => window.location.reload(),
          }}
        />
      );
    }

    return this.props.children;
  }
}
