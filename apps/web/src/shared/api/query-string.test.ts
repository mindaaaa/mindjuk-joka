import { describe, expect, test } from 'vitest';

import { buildQuery } from './query-string';

describe('buildQuery', () => {
  test('값들을 쿼리스트링으로 직렬화하고 선행 ?를 붙인다', () => {
    expect(buildQuery({ size: 20, order: 'desc' })).toBe('?size=20&order=desc');
  });

  test('undefined/빈 문자열 값은 생략한다', () => {
    expect(buildQuery({ size: 20, cursor: undefined, states: '' })).toBe(
      '?size=20',
    );
  });

  test('cursor가 undefined면 첫 페이지에서 키 자체가 빠진다', () => {
    const queryString = buildQuery({ order: 'asc', cursor: undefined });

    expect(queryString).toBe('?order=asc');
    expect(queryString.includes('cursor')).toBe(false);
  });

  test('모든 값이 비면 빈 문자열을 반환한다', () => {
    expect(buildQuery({ cursor: undefined, states: '' })).toBe('');
  });

  test('숫자 0은 생략하지 않고 유지한다', () => {
    expect(buildQuery({ size: 0 })).toBe('?size=0');
  });

  test('배열은 같은 key를 반복해 펼친다', () => {
    expect(buildQuery({ states: ['PENDING', 'DONE'] })).toBe(
      '?states=PENDING&states=DONE',
    );
  });

  test('배열과 낱개 값을 함께 직렬화한다', () => {
    expect(buildQuery({ states: ['PENDING', 'DONE'], size: 20 })).toBe(
      '?states=PENDING&states=DONE&size=20',
    );
  });

  test('빈 배열은 키 자체가 빠진다', () => {
    expect(buildQuery({ states: [] })).toBe('');
  });

  test('배열 안의 빈 문자열 항목만 건너뛴다', () => {
    expect(buildQuery({ states: ['PENDING', '', 'DONE'] })).toBe(
      '?states=PENDING&states=DONE',
    );
  });

  test('특수문자가 든 값은 인코딩한다', () => {
    expect(buildQuery({ q: 'a b&c' })).toBe('?q=a+b%26c');
  });
});
