import { beforeEach, describe, expect, test, vi } from 'vitest';

import { usePhotoRefreshStore } from './store';

function run(task: () => Promise<unknown>) {
  return usePhotoRefreshStore.getState().run(task);
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('usePhotoRefreshStore.run', () => {
  beforeEach(() => usePhotoRefreshStore.setState({ isRefreshing: false }));

  test('작업이 끝날 때까지 isRefreshing이 유지된다', async () => {
    const task = deferred();

    const running = run(() => task.promise);
    expect(usePhotoRefreshStore.getState().isRefreshing).toBe(true);

    task.resolve();
    await running;
    expect(usePhotoRefreshStore.getState().isRefreshing).toBe(false);
  });

  // 헤더 버튼을 연타하거나, 버튼 새로고침 중에 목록을 당기는 상황.
  test('진행 중에 다시 호출하면 작업이 한 번만 실행된다', async () => {
    const task = deferred();
    const spy = vi.fn(() => task.promise);

    const running = run(spy);
    await run(spy);

    expect(spy).toHaveBeenCalledTimes(1);

    task.resolve();
    await running;
  });

  test('작업이 실패해도 잠금이 풀려 다시 시도할 수 있다', async () => {
    await expect(run(() => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom',
    );

    expect(usePhotoRefreshStore.getState().isRefreshing).toBe(false);

    const retry = vi.fn(() => Promise.resolve());
    await run(retry);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
