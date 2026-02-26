/** 로그 계층: expected(정상) → business(UX) → operational(프로세스) → bug(예외) */
export type LogLayer = 'expected' | 'business' | 'operational' | 'bug';
export type MediaState = 'DRAFT' | 'PREPARING' | 'COMPLETE';
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

/** 모든 로그에 공통으로 포함되는 컨텍스트 */
export interface LogContext {
  operationId?: string;
  mediaState?: MediaState;
  userRole?: UserRole;
  [key: string]: unknown;
}

/** 이벤트 페이로드에 항상 들어가는 공통 필드 */
export interface CommonFields {
  layer: LogLayer;
  operationId?: string;
  mediaState?: MediaState;
  userRole?: UserRole;
}
