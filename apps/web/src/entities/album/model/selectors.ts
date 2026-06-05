import { useAlbumStore } from './store';

export const useCurrentAlbumRole = () => useAlbumStore((s) => s.current?.role);
