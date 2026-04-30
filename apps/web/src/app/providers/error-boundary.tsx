import { Component, type ErrorInfo, type ReactNode } from 'react';

import { log } from '@/shared/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * 전역 ErrorBoundary.
 * 비동기 처리되지 않은 에러(Promise)도 추적하고 싶다면 추가
 * 렌더링 예외를 포착해 bug 계층으로 전송한다.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
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
      return (
        this.props.fallback ?? (
          <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
            <h2>오류가 발생했습니다.</h2>
            <p>새로고침 후 다시 시도해 주세요.</p>
            <button onClick={() => window.location.reload()}>새로고침</button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
