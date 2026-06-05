import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useUploadQueueStore } from './store';
import type { UploadQueueItem } from './types';
import { uploadSinglePhoto } from '../api/mutations';

import { MAX_RETRY_COUNT } from '@/app/providers/constants';
import { photoKeys } from '@/entities/photo/api/keys';
import { recordNetworkRetryExceeded } from '@/shared/lib/business-ux-logging';

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return '업로드에 실패했어요.';
}

function handleSuccess(id: string, mediaId: string): void {
  const store = useUploadQueueStore.getState();

  store.setStatus(id, { status: 'success', mediaId });
  store.setProgress(id, 100);
}

function handleFailure(id: string, err: unknown): void {
  if (isAbortError(err)) return;

  const store = useUploadQueueStore.getState();
  store.incrementRetry(id);

  const updated = store.items.find((item) => item.id === id);
  if (updated && updated.retryCount >= MAX_RETRY_COUNT) {
    recordNetworkRetryExceeded({
      retryCount: updated.retryCount,
      operationId: 'upload_flow',
    });
  }

  store.setStatus(id, {
    status: 'error',
    errorMessage: describeError(err),
  });
}

export function useUploadRunner() {
  const queryClient = useQueryClient();
  const abortersRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    let unmounted = false;

    async function runUpload(item: UploadQueueItem): Promise<boolean> {
      const controller = new AbortController();
      abortersRef.current.set(item.id, controller);

      try {
        const mediaId = await uploadSinglePhoto(item, {
          signal: controller.signal,
          onStep: (step) =>
            useUploadQueueStore.getState().setStatus(item.id, { step }),
          onProgress: (pct) =>
            useUploadQueueStore.getState().setProgress(item.id, pct),
        });

        handleSuccess(item.id, mediaId);
        return true;
      } catch (err) {
        handleFailure(item.id, err);
        return false;
      } finally {
        abortersRef.current.delete(item.id);
      }
    }

    async function processNext(): Promise<void> {
      if (unmounted) return;

      const state = useUploadQueueStore.getState();
      if (state.isRunning) return;

      const next = state.items.find((it) => it.status === 'pending');
      if (!next) return;

      state.setRunning(true);
      state.setStatus(next.id, { status: 'uploading', step: 'create' });
      state.setProgress(next.id, 0);

      const success = await runUpload(next);
      useUploadQueueStore.getState().setRunning(false);

      if (success) {
        queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
      }

      if (!unmounted) {
        queueMicrotask(() => void processNext());
      }
    }

    const unsubscribe = useUploadQueueStore.subscribe(() => {
      void processNext();
    });
    void processNext();

    return () => {
      unmounted = true;
      unsubscribe();
      abortersRef.current.forEach((c) => c.abort());
      abortersRef.current.clear();
    };
  }, [queryClient]);

  const cancel = useCallback((id: string) => {
    const controller = abortersRef.current.get(id);
    controller?.abort();
    useUploadQueueStore.getState().remove(id);
  }, []);

  const cancelAll = useCallback(() => {
    abortersRef.current.forEach((controller) => controller.abort());
    abortersRef.current.clear();

    const store = useUploadQueueStore.getState();
    store.items.forEach((item) => {
      if (item.status === 'pending' || item.status === 'uploading') {
        store.setStatus(item.id, { status: 'canceled', step: undefined });
      }
    });
  }, []);

  return { cancel, cancelAll };
}
