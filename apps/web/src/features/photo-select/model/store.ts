import { create } from 'zustand';

interface PhotoSelectState {
  enabled: boolean;
  selectedIds: Set<string>;

  toggleMode: () => void;
  toggle: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clear: () => void;
}

/**
 * 다중 선택 상태
 * - selectedIds는 매 변경마다 새 Set을 반환해 구독 컴포넌트가 참조 변경을 감지한다.
 */
export const usePhotoSelectStore = create<PhotoSelectState>((set) => ({
  enabled: false,
  selectedIds: new Set(),

  toggleMode: () =>
    set((state) => ({
      enabled: !state.enabled,
      selectedIds: state.enabled ? new Set() : state.selectedIds,
    })),

  toggle: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectMany: (ids) => set({ selectedIds: new Set(ids) }),

  clear: () => set({ selectedIds: new Set() }),
}));
