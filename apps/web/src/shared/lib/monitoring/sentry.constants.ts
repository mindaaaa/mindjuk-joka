/** operational 계층 중 Sentry로 전송할 메시지 allowlist */
export const OPERATIONAL_ALLOWLIST = [
  'OP|upload|confirm_failed',
  'OP|upload|not_completed',
] as const;

/** business 계층 샘플링 비율 (0~1) */
export const BUSINESS_SAMPLE_RATE = 0.1;
