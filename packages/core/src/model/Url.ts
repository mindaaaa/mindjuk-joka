import { z } from 'zod';

export class Url {
  private readonly url: URL;

  static from(url: unknown): Url {
    Url.Schema.parse(url);
    return new Url(url as string);
  }

  static get Schema() {
    return z
      .string()
      .url()
      .refine(
        (url: string) => {
          try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
          } catch {
            return false;
          }
        },
        {
          message: 'URL은 http 또는 https 프로토콜을 사용해야 합니다',
        },
      );
  }

  private constructor(url: string) {
    this.url = new URL(url);
  }

  get path() {
    const url = this.url.href;

    Url.Schema.parse(url);

    return url;
  }
}

export type UrlInput = z.infer<typeof Url.Schema>;
