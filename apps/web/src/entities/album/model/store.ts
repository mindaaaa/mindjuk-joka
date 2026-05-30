import { create } from 'zustand';

import { albumIdStore } from '@/shared/api/album-id';

import type { Album } from './types';

interface AlbumState {
  current: Album | null;
  setCurrent: (album: Album | null) => void;
  clear: () => void;
}

export const useAlbumStore = create<AlbumState>((set) => ({
  current: null,
  setCurrent: (album) => {
    albumIdStore.set(album?.id ?? null);
    set({ current: album });
  },
  clear: () => {
    albumIdStore.clear();
    set({ current: null });
  },
}));
