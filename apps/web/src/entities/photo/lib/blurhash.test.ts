import { describe, expect, test } from 'vitest';

import { blurhashToDataUrl } from './blurhash';

describe('blurhashToDataUrl', () => {
  test('유효하지 않은 해시는 예외 없이 undefined', () => {
    expect(blurhashToDataUrl('not-a-blurhash')).toBeUndefined();
  });

  test('빈 문자열도 안전하게 undefined', () => {
    expect(blurhashToDataUrl('')).toBeUndefined();
  });
});
