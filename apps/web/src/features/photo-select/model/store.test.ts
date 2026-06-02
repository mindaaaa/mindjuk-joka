import { beforeEach, describe, expect, test } from 'vitest';

import { usePhotoSelectStore } from './store';

function reset() {
  usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
}

describe('usePhotoSelectStore', () => {
  beforeEach(reset);

  test('toggle은 추가/제거를 번갈아 수행한다', () => {
    const { toggle } = usePhotoSelectStore.getState();

    toggle('a');
    expect([...usePhotoSelectStore.getState().selectedIds]).toEqual(['a']);

    toggle('a');
    expect(usePhotoSelectStore.getState().selectedIds.size).toBe(0);
  });

  test('toggle은 서로 다른 id를 누적한다', () => {
    const { toggle } = usePhotoSelectStore.getState();

    toggle('a');
    toggle('b');

    expect([...usePhotoSelectStore.getState().selectedIds].sort()).toEqual([
      'a',
      'b',
    ]);
  });

  test('toggle은 매번 새로운 Set 참조를 만든다', () => {
    const before = usePhotoSelectStore.getState().selectedIds;

    usePhotoSelectStore.getState().toggle('a');

    const after = usePhotoSelectStore.getState().selectedIds;
    expect(after).not.toBe(before);
  });

  test('toggleMode는 켤 때 기존 선택을 유지한다', () => {
    usePhotoSelectStore.getState().selectMany(['a', 'b']);

    usePhotoSelectStore.getState().toggleMode();

    expect(usePhotoSelectStore.getState().enabled).toBe(true);
    expect(usePhotoSelectStore.getState().selectedIds.size).toBe(2);
  });

  test('toggleMode는 끌 때 선택을 비운다', () => {
    const store = usePhotoSelectStore.getState();
    store.toggleMode();
    store.toggle('a');

    expect(usePhotoSelectStore.getState().enabled).toBe(true);
    expect(usePhotoSelectStore.getState().selectedIds.size).toBe(1);

    usePhotoSelectStore.getState().toggleMode();

    expect(usePhotoSelectStore.getState().enabled).toBe(false);
    expect(usePhotoSelectStore.getState().selectedIds.size).toBe(0);
  });

  test('selectMany는 선택 집합을 통째로 교체한다', () => {
    usePhotoSelectStore.getState().toggle('z');

    usePhotoSelectStore.getState().selectMany(['a', 'b', 'c']);

    expect([...usePhotoSelectStore.getState().selectedIds].sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('clear는 선택을 비운다', () => {
    usePhotoSelectStore.getState().selectMany(['a', 'b']);

    usePhotoSelectStore.getState().clear();

    expect(usePhotoSelectStore.getState().selectedIds.size).toBe(0);
  });
});
