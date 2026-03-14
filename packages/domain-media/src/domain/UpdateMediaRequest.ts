import { UncaughtException } from '@joka/core/src/exception';
import { Nullable, Nullish } from '@joka/core/src/type';
import { z } from 'zod';

import { Content } from './Content';
import { Media } from './Media';

interface ConstructorParameters {
  cid: string;
  description: Nullish<string>;
  state: Nullish<string>;
  content: Nullish<Content>;
  isForced: boolean;
}

export class UpdateMediaRequest {
  static from(params: ConstructorParameters): UpdateMediaRequest {
    const { cid, description, isForced } = params;
    const state = params.state as keyof typeof Media.State;
    const content = params.content === undefined ? undefined : params.content;

    UpdateMediaRequest.Schema.parse({
      cid,
      description,
      state,
      content: content?.data || null,
    });

    return new UpdateMediaRequest(cid, description, state, content, isForced);
  }

  static get Schema() {
    return z
      .object({
        cid: z.string().min(1),
        description: z.string().min(1).optional(),
        state: z.enum(Object.values(Media.State)).optional(),
        content: Content.Schema.nullish(),
        isForced: z.boolean(),
      })
      .strict();
  }

  private constructor(
    public readonly cid: string,
    public readonly description: Nullish<string>,
    public readonly state: Nullish<keyof typeof Media.State>,
    public readonly requestedContent: Nullish<Content>,
    public readonly isForced: boolean,
  ) {}

  get shouldUpdateContent(): boolean {
    return this.requestedContent !== undefined;
  }

  get content(): Nullable<Content> {
    // 요청된 바가 명시된 경우에만 반영
    if (this.shouldUpdateContent) {
      return this.requestedContent ?? null;
    }

    throw new UncaughtException(`INVALID_UPDATE_REQUEST`, [
      `유효하지 않은 Media 수정 요청입니다.`,
      `관리자에게 문의하세요.`,
    ]);
  }
}
