/** 로그/Sentry 공통: 로그 계층 (expected → business → operational → bug) */
export type LogLayer = 'expected' | 'business' | 'operational' | 'bug';

/** 미디어 상태 */
export type MediaState = 'DRAFT' | 'PREPARING' | 'COMPLETE';
