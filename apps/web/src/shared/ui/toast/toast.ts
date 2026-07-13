import { toast as sonner, type ExternalToast } from 'sonner';

/**
 * 토스트 노출 시간 정책
 * - 성공/안내는 짧게: 읽지 못해도 흐름에 지장이 없다.
 * - 실패는 길게: 원인을 읽고 다음 행동을 정할 시간이 필요하다.
 */
export const TOAST_DURATION = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 6000,
} as const;

type Message = Parameters<typeof sonner.success>[0];

/** sonner의 toast에 노출 시간·닫기 버튼 기본값만 입힌 래퍼 */
export const toast = {
  success: (message: Message, options?: ExternalToast) =>
    sonner.success(message, { duration: TOAST_DURATION.success, ...options }),

  info: (message: Message, options?: ExternalToast) =>
    sonner.info(message, { duration: TOAST_DURATION.info, ...options }),

  warning: (message: Message, options?: ExternalToast) =>
    sonner.warning(message, { duration: TOAST_DURATION.warning, ...options }),

  // 오래 떠 있는 만큼 사용자가 직접 닫을 수 있어야 한다.
  error: (message: Message, options?: ExternalToast) =>
    sonner.error(message, {
      duration: TOAST_DURATION.error,
      closeButton: true,
      ...options,
    }),

  dismiss: sonner.dismiss,
};
