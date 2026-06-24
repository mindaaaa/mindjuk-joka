import { z } from 'zod';

import { log } from '@/shared/lib/logger';

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1, 'API 주소가 설정되어 있지 않습니다.'),
  VITE_AUTH_REFRESH_PATH: z.string().min(1).default('/v1/auth/refresh'),
  /**
   * @description 분석 이벤트(appVersion) 및 Sentry 연동에 사용되는 앱 버전입니다.
   * @note CI 빌드 단계에서 package.json 버전을 환경 변수로 주입해야 합니다.
   */
  VITE_APP_VERSION: z.string().default('0.0.0'),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const error = new Error('환경변수 검증 실패');
  log.bug(error, {
    stage: 'startup',
    issues: parsed.error.issues,
  });

  const summary = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`환경변수 설정이 잘못되었습니다.\n${summary}`);

  console.table(parsed.error.issues, ['path', 'message']);

  throw error;
}

export const env = parsed.data;
