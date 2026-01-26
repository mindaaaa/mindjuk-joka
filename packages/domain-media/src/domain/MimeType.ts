import * as mime from 'mime-types';
import { z } from 'zod';

export class MimeType {
  public readonly type: string;
  public readonly subType: string;

  static from(value: unknown): MimeType {
    MimeType.Schema.parse(value);

    return new MimeType(value as string);
  }

  static get Schema() {
    return z.string().refine(
      (value) => {
        /**
         * MIME 타입 형식 검증
         * - 알파벳/숫자/하이픈/플러스 조합 (예: png, jpeg, x-www-form-urlencoded)
         * @example image/png, video/mp4, audio/mpeg
         */
        const mimeTypeRegex = /^[a-z]+\/[a-z0-9\-+]+$/i;
        return mimeTypeRegex.test(value) && !!mime.extension(value);
      },
      {
        message: '유효하지 않은 MIME 타입 형식입니다',
      },
    );
  }

  private constructor(value: string) {
    const [type, subType] = value.split('/');

    this.type = type as string;
    this.subType = subType as string;
  }

  get value() {
    return [this.type, this.subType].join('/');
  }
}
