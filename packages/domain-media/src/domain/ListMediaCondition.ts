import { Nullable, Nullish } from '@joka/core/src/type';
import { z } from 'zod';

interface ConstructorParameters {
  limit?: unknown;
  filter: Filter;
  cursor?: Nullish<Cursor>;
  sortOrder?: Nullish<string>;
}

interface Filter {
  albumId: number;
  states: string[];
}

interface Cursor {
  cid: string;
}

const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

// TODO: 일단 최신순 기준으로만 정렬함!
export class ListMediaCondition {
  static get DefaultLimit() {
    return 20;
  }

  static get SortOrder() {
    return SortOrder;
  }

  static from(params: ConstructorParameters): ListMediaCondition {
    const limit = Number(params.limit) || ListMediaCondition.DefaultLimit;
    const filter = params.filter;
    const cursor = params.cursor || null;
    const sortOrder = params.sortOrder || SortOrder.DESC;

    const condition = new ListMediaCondition(
      limit,
      filter,
      cursor,
      sortOrder as (typeof SortOrder)[keyof typeof SortOrder],
    );

    ListMediaCondition.Schema.parse(condition);

    return condition;
  }

  static get Schema() {
    return z.object({
      limit: z.int().positive(),
      filter: z.object({
        albumId: z.number().positive(),
        states: z.array(z.string().min(1)).min(0),
      }),
      cursor: z
        .object({
          cid: z.string().min(1),
        })
        .nullable(),
      sortOrder: z.enum(Object.values(SortOrder)),
    });
  }

  private constructor(
    public readonly limit: number,
    public readonly filter: Filter,
    public readonly cursor: Nullable<Cursor>,
    public readonly sortOrder: (typeof SortOrder)[keyof typeof SortOrder],
  ) {}

  get hasDescendingOrder(): boolean {
    return this.sortOrder === SortOrder.DESC;
  }

  get adjustedLimit() {
    // 1개 더 꺼내오기
    return this.limit + 1;
  }

  get data() {
    return { ...this };
  }
}
