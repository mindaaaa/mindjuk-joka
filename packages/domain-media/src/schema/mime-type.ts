import { z } from 'zod';

export const mimeTypeSchema = z.string().refine(
  (value) => {
    /**
     * MIME 타입 형식 검증
     * - 알파벳/숫자/하이픈/플러스 조합 (예: png, jpeg, x-www-form-urlencoded)
     * - 실제 MIME 타입 유효성은 도메인 모델(MimeType.from)에서 검증
     * @example image/png, video/mp4, audio/mpeg
     */
    const mimeTypeRegex = /^[a-z]+\/[a-z0-9\-+]+$/i;
    return mimeTypeRegex.test(value);
  },
  {
    message: '유효하지 않은 MIME 타입 형식입니다',
  },
);

export type MimeTypeInput = z.infer<typeof mimeTypeSchema>;
