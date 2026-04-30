import { z } from 'zod';

export class Url {
  private readonly url: URL;

  static from(url: unknown): Url {
    Url.Schema.parse(url);
    return new Url(url as string);
  }

  static get Schema() {
    return z.url().refine(
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

  get fullPath() {
    const url = this.url.href;

    Url.Schema.parse(url);

    return url;
  }

  getPath(options?: { withoutBeginningSlash?: boolean }) {
    const { withoutBeginningSlash = false } = options || {};
    return withoutBeginningSlash
      ? this.removeBeginningSlashSafely()
      : this.url.pathname;
  }

  private removeBeginningSlashSafely(): string {
    return this.url.pathname.startsWith('/')
      ? this.url.pathname.slice(1)
      : this.url.pathname;
  }
}

export type UrlInput = z.infer<typeof Url.Schema>;
