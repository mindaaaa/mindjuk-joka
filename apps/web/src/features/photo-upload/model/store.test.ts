import { beforeEach, describe, expect, test } from 'vitest';

import { useUploadQueueStore } from './store';

function makeFile(name: string): File {
  return new File([new Uint8Array(10)], name, { type: 'image/jpeg' });
}

describe('useUploadQueueStore', () => {
  beforeEach(() => {
    useUploadQueueStore.getState().reset();
  });

  test('enqueue 는 파일명을 description 기본값으로 채운다', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg'), makeFile('b.png')]);
    const items = useUploadQueueStore.getState().items;

    expect(items).toHaveLength(2);
    expect(items[0].description).toBe('a');
    expect(items[1].description).toBe('b');
    expect(items.every((it) => it.status === 'pending')).toBe(true);
    expect(items.every((it) => it.progress === 0)).toBe(true);
    expect(items.every((it) => it.retryCount === 0)).toBe(true);
  });

  test('setProgress 는 0~100 으로 클램프', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg')]);
    const id = useUploadQueueStore.getState().items[0].id;

    useUploadQueueStore.getState().setProgress(id, 150);
    expect(useUploadQueueStore.getState().items[0].progress).toBe(100);

    useUploadQueueStore.getState().setProgress(id, -10);
    expect(useUploadQueueStore.getState().items[0].progress).toBe(0);

    useUploadQueueStore.getState().setProgress(id, 42);
    expect(useUploadQueueStore.getState().items[0].progress).toBe(42);
  });

  test('setStatus 는 부분 업데이트', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg')]);
    const id = useUploadQueueStore.getState().items[0].id;

    useUploadQueueStore
      .getState()
      .setStatus(id, { status: 'uploading', step: 'put' });
    const item = useUploadQueueStore.getState().items[0];
    expect(item.status).toBe('uploading');
    expect(item.step).toBe('put');
    expect(item.description).toBe('a');
  });

  test('remove 후 길이 감소', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg'), makeFile('b.jpg')]);
    const firstId = useUploadQueueStore.getState().items[0].id;

    useUploadQueueStore.getState().remove(firstId);
    const remaining = useUploadQueueStore.getState().items;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].file.name).toBe('b.jpg');
  });

  test('updateDescription 반영', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg')]);
    const id = useUploadQueueStore.getState().items[0].id;

    useUploadQueueStore.getState().updateDescription(id, '새 설명');
    expect(useUploadQueueStore.getState().items[0].description).toBe('새 설명');
  });

  test('incrementRetry 누적', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg')]);
    const id = useUploadQueueStore.getState().items[0].id;

    useUploadQueueStore.getState().incrementRetry(id);
    useUploadQueueStore.getState().incrementRetry(id);
    expect(useUploadQueueStore.getState().items[0].retryCount).toBe(2);
  });

  test('reset 은 큐와 isRunning 모두 초기화', () => {
    useUploadQueueStore.getState().enqueue([makeFile('a.jpg')]);
    useUploadQueueStore.getState().setRunning(true);

    useUploadQueueStore.getState().reset();
    expect(useUploadQueueStore.getState().items).toEqual([]);
    expect(useUploadQueueStore.getState().isRunning).toBe(false);
  });
});
