import { create } from 'zustand';

interface PhotoRefreshState {
  isRefreshing: boolean;
  /** 진행 중이면 새 작업을 무시한다. 헤더 버튼과 당겨서 새로고침이 겹쳐도 요청은 한 번만 나간다. */
  run: (task: () => Promise<unknown>) => Promise<void>;
}

/**
 * 새로고침 진행 상태를 헤더(top-bar)와 목록(photo-list)이 함께 본다.
 * - 어느 쪽에서 시작하든 버튼은 회전하고, 다른 쪽 트리거는 잠긴다.
 */
export const usePhotoRefreshStore = create<PhotoRefreshState>((set, get) => ({
  isRefreshing: false,

  run: async (task) => {
    if (get().isRefreshing) return;

    set({ isRefreshing: true });

    try {
      await task();
    } finally {
      // 실패해도 잠금은 반드시 풀어야 다시 시도할 수 있다.
      set({ isRefreshing: false });
    }
  },
}));
