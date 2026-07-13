import type { UserRole } from '@/entities/user';

export type AnalyticsEvent =
  | 'auth.login_success'
  | 'auth.logout'
  | 'list.view'
  | 'list.scroll_depth'
  | 'list.refresh'
  | 'detail.view'
  | 'api.timing'
  | 'upload.session_complete'
  | 'download.single_start'
  | 'download.single_success'
  | 'download.single_fail'
  | 'download.bulk_start'
  | 'download.bulk_success'
  | 'download.bulk_fail';

/**
 * 이벤트별 추가 데이터 (Key-Value)
 *
 * - 프라이버시 보호를 위해 개인정보(이메일, 이름, 파일명 등) 포함을 엄격히 금지합니다.
 * - 통계 분석을 위한 원시 데이터(크기, 개수, 타입, ON/OFF 플래그 등)만 허용합니다.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

/**
 * 수집 서버(POST /v1/user-events)로 전송할 공통 이벤트 포맷
 *
 * - name·timestamp·userRole은 서버 필수 필드다.
 * - 그 밖의 필드는 서버가 추가 속성으로 함께 저장한다.
 * - anonUserId: 프라이버시 보호를 위해 user.id를 SHA-256(16hex)으로 해싱한 값 (원본 ID/이메일 포함 금지)
 * - route: 통계 그룹화를 위해 실제 URL이 아닌 라우트 패턴(예: /photos/:id) 형태로 정규화하여 기록
 */
export interface EventEnvelope {
  name: AnalyticsEvent;
  timestamp: number;
  userRole: UserRole;
  sessionId: string;
  anonUserId: string | null;
  route: string;
  appVersion: string;
  props?: AnalyticsProps;
}
