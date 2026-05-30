import { z } from 'zod';
import { log } from '@/shared/lib/logger';

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1, 'API 주소가 설정되어 있지 않습니다.'),
  VITE_AUTH_REFRESH_PATH: z.string().min(1).default('/v1/auth/refresh'),
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
