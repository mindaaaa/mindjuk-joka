import { nanoid } from 'nanoid';
import { create } from 'zustand';

import type { UploadQueueItem } from './types';

interface StatusPatch {
  status?: UploadQueueItem['status'];
  step?: UploadQueueItem['step'] | undefined;
  errorMessage?: string | undefined;
  mediaId?: string | undefined;
  syncedDescription?: string | undefined;
}

interface UploadQueueState {
  items: UploadQueueItem[];
  isRunning: boolean;

  enqueue: (files: File[]) => void;
  remove: (id: string) => void;
  reset: () => void;

  updateDescription: (id: string, description: string) => void;
  setStatus: (id: string, patch: StatusPatch) => void;
  setProgress: (id: string, progress: number) => void;
  incrementRetry: (id: string) => void;

  setRunning: (running: boolean) => void;
}

function makeItem(file: File): UploadQueueItem {
  return {
    id: nanoid(),
    file,
    description: '',
    status: 'pending',
    progress: 0,
    retryCount: 0,
  };
}

function patchItem(
  items: UploadQueueItem[],
  id: string,
  update: (item: UploadQueueItem) => UploadQueueItem,
): UploadQueueItem[] {
  return items.map((it) => (it.id === id ? update(it) : it));
}

export const useUploadQueueStore = create<UploadQueueState>((set) => ({
  items: [],
  isRunning: false,

  // 큐 조작
  enqueue: (files) =>
    set((state) => ({ items: [...state.items, ...files.map(makeItem)] })),
  remove: (id) =>
    set((state) => ({ items: state.items.filter((it) => it.id !== id) })),
  reset: () => set({ items: [], isRunning: false }),

  // 항목 수정
  updateDescription: (id, description) =>
    set((state) => ({
      items: patchItem(state.items, id, (it) => ({ ...it, description })),
    })),
  setStatus: (id, patch) =>
    set((state) => ({
      items: patchItem(state.items, id, (it) => ({ ...it, ...patch })),
    })),
  setProgress: (id, progress) =>
    set((state) => {
      const clamped = Math.min(100, Math.max(0, progress));
      return {
        items: patchItem(state.items, id, (it) => ({
          ...it,
          progress: clamped,
        })),
      };
    }),
  incrementRetry: (id) =>
    set((state) => ({
      items: patchItem(state.items, id, (it) => ({
        ...it,
        retryCount: it.retryCount + 1,
      })),
    })),

  // 실행 락
  setRunning: (isRunning) => set({ isRunning }),
}));
