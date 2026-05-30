import { describe, expect, test } from 'vitest';

import { photoKeys } from './keys';

describe('photoKeys factory', () => {
  test('상위 → 하위 prefix가 일관되게 누적된다', () => {
    expect(photoKeys.all).toEqual(['photos']);
    expect(photoKeys.lists()).toEqual(['photos', 'list']);
    expect(photoKeys.details()).toEqual(['photos', 'detail']);
    expect(photoKeys.list({ sortBy: 'createdAt', order: 'desc' })).toEqual([
      'photos',
      'list',
      { sortBy: 'createdAt', order: 'desc' },
    ]);
    expect(photoKeys.detail('abc')).toEqual(['photos', 'detail', 'abc']);
  });

  test('list()는 filters가 없으면 빈 객체로 정규화한다', () => {
    expect(photoKeys.list()).toEqual(['photos', 'list', {}]);
  });

  test('filters 속성 순서가 달라도 같은 키로 취급된다', () => {
    expect(photoKeys.list({ sortBy: 'createdAt', order: 'desc' })).toEqual(
      photoKeys.list({ order: 'desc', sortBy: 'createdAt' }),
    );
  });

  test('lists() prefix로 무효화해도 detail 키는 매칭되지 않는다', () => {
    const matches = (prefix: readonly unknown[], key: readonly unknown[]) =>
      prefix.every((seg, i) => key[i] === seg);

    expect(matches(photoKeys.lists(), photoKeys.list())).toBe(true);
    expect(matches(photoKeys.lists(), photoKeys.detail('1'))).toBe(false);
  });
});
