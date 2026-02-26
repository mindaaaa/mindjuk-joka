/**
 * Sentry 초기화를 app/providers에서 1회만 실행.
 * 앱 엔트리(index.tsx)에서 initSentry()를 호출한다.
 */
export { initSentry } from '@/shared/lib/monitoring/sentry';
