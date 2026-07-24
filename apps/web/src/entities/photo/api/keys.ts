export interface PhotoListFilters {
  sortBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  /** true면 즐겨찾기 사진만 필터/false면 전체. */
  isFavorite?: boolean;
}

export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters?: PhotoListFilters) =>
    [...photoKeys.lists(), filters ?? {}] as const,
  details: () => [...photoKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
};
