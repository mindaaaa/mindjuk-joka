import { create } from 'zustand';

export type SortOrder = 'asc' | 'desc';

interface PhotoSortState {
  order: SortOrder;
  setOrder: (order: SortOrder) => void;
}

export const usePhotoSortStore = create<PhotoSortState>((set) => ({
  order: 'desc',
  setOrder: (order) => set({ order }),
}));
