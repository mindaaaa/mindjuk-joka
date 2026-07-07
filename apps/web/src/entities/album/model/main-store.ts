import { create } from 'zustand';

interface MainAlbumState {
  mainAlbumId: string | null;
  setMain: (albumId: string | null) => void;
}

const STORAGE_KEY = 'joka-main-album';
const isBrowser = typeof window !== 'undefined';

function getInitial(): string | null {
  return isBrowser ? localStorage.getItem(STORAGE_KEY) : null;
}

// TODO: 서버 영속화 API가 생기면 localStorage 대신 사용자 계정에 저장
export const useMainAlbumStore = create<MainAlbumState>((set) => ({
  mainAlbumId: getInitial(),
  setMain: (albumId) => {
    set({ mainAlbumId: albumId });

    if (!isBrowser) return;
    if (albumId) localStorage.setItem(STORAGE_KEY, albumId);
    else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));
