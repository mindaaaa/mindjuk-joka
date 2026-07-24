import { Nullable, Nullish } from '@joka/core/src/type';
import { z } from 'zod';

interface ConstructorParameters {
  limit?: unknown;
  filter: Filter;
  cursor?: Nullish<Cursor>;
  sortOrder?: Nullish<string>;
}

interface Filter {
  userId: number;
}

interface Cursor {
  cid: string;
}

const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrderValue = (typeof SortOrder)[keyof typeof SortOrder];

export class ListActorsCondition {
  static get DefaultLimit() {
    return 20;
  }

  static get SortOrder() {
    return SortOrder;
  }

  static from(params: ConstructorParameters): ListActorsCondition {
    const limit = Number(params.limit) || ListActorsCondition.DefaultLimit;
    const filter = params.filter;
    const cursor = params.cursor || null;
    const sortOrder = params.sortOrder || SortOrder.DESC;

    const condition = new ListActorsCondition(
      limit,
      filter,
      cursor,
      sortOrder as (typeof SortOrder)[keyof typeof SortOrder],
    );

    ListActorsCondition.Schema.parse(condition);

    return condition;
  }

  static get Schema() {
    return z.object({
      limit: z.int().positive(),
      filter: z.object({
        userId: z.number().positive(),
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

  // TODO: ListCondition에 대한 공통 부모를 정의해야할 듯
  get adjustedLimit() {
    // 1개 더 꺼내오기
    return this.limit + 1;
  }

  get data() {
    return { ...this };
  }
}

export interface ListAlbumsPagination {
  size: number;
  order: SortOrderValue;
  nextCursor: Nullable<string>;
  hasNext: boolean;
}
