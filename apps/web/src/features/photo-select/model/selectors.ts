import { usePhotoSelectStore } from './store';

export const useSelectEnabled = () => usePhotoSelectStore((s) => s.enabled);
export const useSelectedCount = () =>
  usePhotoSelectStore((s) => s.selectedIds.size);
export const useSelectedIds = () => usePhotoSelectStore((s) => s.selectedIds);

export const useIsSelected = (id: string) =>
  usePhotoSelectStore((s) => s.selectedIds.has(id));
