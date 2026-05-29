export interface PhotoListFilters {
  sortBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters?: PhotoListFilters) =>
    [...photoKeys.lists(), filters ?? {}] as const,
  details: () => [...photoKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
};
