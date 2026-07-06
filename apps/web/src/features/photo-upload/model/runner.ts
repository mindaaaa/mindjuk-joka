import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useUploadQueueStore } from './store';
import type { UploadQueueItem } from './types';
import { uploadSinglePhoto } from '../api/mutations';

import { MAX_RETRY_COUNT } from '@/app/providers/constants';
import { prependMediaToLists, type MediaDto } from '@/entities/photo';
import type { User } from '@/entities/user';
import { track } from '@/shared/lib/analytics';
import { recordNetworkRetryExceeded } from '@/shared/lib/business-ux-logging';
import { toast } from '@/shared/ui/toast';

const ANON_UPLOADER: User = { id: '', name: '', email: '' };

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return '업로드에 실패했어요.';
}

function handleSuccess(
  id: string,
  mediaId: string,
  syncedDescription: string,
): void {
  const store = useUploadQueueStore.getState();

  store.setStatus(id, { status: 'success', mediaId, syncedDescription });
  store.setProgress(id, 100);
}

/**
 * 업로드 성공 시 목록 캐시 맨 앞에 끼워넣을 낙관적 미디어를 만든다.
 * - 표시 URL은 방금 고른 로컬 File의 objectURL → R2 재요청 없이 즉시 노출
 * - 썸네일/eTag 등 서버 전용 필드는 비워두고, 실제 값은 다음 정상 fetch가 채운다
 */
function buildOptimisticDto(
  mediaId: string,
  item: UploadQueueItem,
  description: string,
  uploader: User,
  objectUrl: string,
): MediaDto {
  return {
    id: mediaId,
    description,
    state: 'COMPLETE',
    isFavorite: false,
    created: { at: new Date().toISOString(), by: uploader },
    content: {
      location: { url: objectUrl, accessUrl: objectUrl },
      size: item.file.size,
      eTag: '',
      mimeType: item.file.type || 'application/octet-stream',
      thumbnail: null,
    },
  };
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

function prependUploaded(
  queryClient: QueryClient,
  mediaId: string,
  item: UploadQueueItem,
  description: string,
  uploader: User,
): void {
  const objectUrl = URL.createObjectURL(item.file);
  const dto = buildOptimisticDto(
    mediaId,
    item,
    description,
    uploader,
    objectUrl,
  );
  prependMediaToLists(queryClient, dto);
}

export function useUploadRunner(
  currentUser?: User | null,
  order: 'asc' | 'desc' = 'desc',
) {
  const queryClient = useQueryClient();
  const abortersRef = useRef(new Map<string, AbortController>());
  const sessionStartRef = useRef<number | null>(null);
  const sessionItemIdsRef = useRef<Set<string>>(new Set());
  const uploaderRef = useRef<User>(currentUser ?? ANON_UPLOADER);
  uploaderRef.current = currentUser ?? ANON_UPLOADER;
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    let unmounted = false;

    async function runUpload(item: UploadQueueItem): Promise<boolean> {
      const controller = new AbortController();
      abortersRef.current.set(item.id, controller);

      const sentDescription = item.description.trim() || item.file.name;

      try {
        const mediaId = await uploadSinglePhoto(item, {
          signal: controller.signal,
          onStep: (step) =>
            useUploadQueueStore.getState().setStatus(item.id, { step }),
          onProgress: (pct) =>
            useUploadQueueStore.getState().setProgress(item.id, pct),
        });

        handleSuccess(item.id, mediaId, sentDescription);

        // asc는 맨 앞 prepend가 오배치므로 건너뜀
        if (orderRef.current === 'desc') {
          prependUploaded(
            queryClient,
            mediaId,
            item,
            sentDescription,
            uploaderRef.current,
          );
        }

        return true;
      } catch (err) {
        if (!controller.signal.aborted) {
          handleFailure(item.id, err);
        }
        return false;
      } finally {
        abortersRef.current.delete(item.id);
      }
    }

    function startUploadSession(): void {
      sessionStartRef.current = Date.now();

      const currentItems = useUploadQueueStore.getState().items;
      sessionItemIdsRef.current = new Set(currentItems.map((it) => it.id));
    }

    function maybeEmitSessionComplete(): void {
      if (sessionStartRef.current === null) return;

      const { items } = useUploadQueueStore.getState();
      const sessionItems = items.filter((it) =>
        sessionItemIdsRef.current.has(it.id),
      );

      const active = sessionItems.some(
        (it) => it.status === 'pending' || it.status === 'uploading',
      );
      if (active) return;

      const ok = sessionItems.filter((it) => it.status === 'success').length;
      const fail = sessionItems.filter((it) => it.status === 'error').length;
      track('upload.session_complete', {
        ok,
        fail,
        durMs: Date.now() - sessionStartRef.current,
      });

      // asc는 prepend를 건너뛰므로 배치 완료 시 1회 토스트
      if (orderRef.current === 'asc' && ok > 0) {
        toast.success(`${ok}장 업로드 완료`);
      }

      sessionStartRef.current = null;
      sessionItemIdsRef.current.clear();
    }

    async function processNext(): Promise<void> {
      if (unmounted) return;

      const state = useUploadQueueStore.getState();
      if (state.isRunning) return;

      const next = state.items.find((it) => it.status === 'pending');
      if (!next) {
        maybeEmitSessionComplete();
        return;
      }

      if (sessionStartRef.current === null) {
        startUploadSession();
      }

      state.setRunning(true);
      state.setStatus(next.id, { status: 'uploading', step: 'create' });
      state.setProgress(next.id, 0);

      await runUpload(next);
      useUploadQueueStore.getState().setRunning(false);

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
