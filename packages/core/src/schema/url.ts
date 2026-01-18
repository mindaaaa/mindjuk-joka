import { z } from 'zod';

export const urlSchema = z
  .string()
  .url()
  .refine(
    (url: string) => {
      try {
        const parsed = new URL(url);
        const protocol = parsed.protocol.replace(':', '');
        return ['http', 'https'].includes(protocol);
      } catch {
        return false;
      }
    },
    {
      message: 'URL은 http 또는 https 프로토콜을 사용해야 합니다',
    },
  );

export type UrlInput = z.infer<typeof urlSchema>;
