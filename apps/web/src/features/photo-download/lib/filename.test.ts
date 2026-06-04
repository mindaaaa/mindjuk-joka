import { describe, expect, test } from 'vitest';

import { downloadFilename } from './filename';

describe('downloadFilename', () => {
  test('description + mimeType 확장자로 파일명을 만든다', () => {
    expect(
      downloadFilename({
        id: 'm1',
        description: '제주 바다',
        mimeType: 'image/png',
      }),
    ).toBe('제주 바다.png');
  });

  test('파일시스템 금지 문자는 _로 치환한다', () => {
    expect(
      downloadFilename({
        id: 'm1',
        description: 'a/b:c*d?',
        mimeType: 'image/jpeg',
      }),
    ).toBe('a_b_c_d_.jpg');
  });

  test('연속 공백은 한 칸으로 정리하고 앞뒤 공백은 제거한다', () => {
    expect(
      downloadFilename({
        id: 'm1',
        description: '  제주   바다  ',
        mimeType: 'image/png',
      }),
    ).toBe('제주 바다.png');
  });

  test('description이 공백뿐이면 id로 폴백한다', () => {
    expect(
      downloadFilename({
        id: 'm1',
        description: '   ',
        mimeType: 'image/webp',
      }),
    ).toBe('m1.webp');
  });

  test('description이 빈 문자열이어도 id로 폴백한다', () => {
    expect(
      downloadFilename({ id: 'm1', description: '', mimeType: 'image/webp' }),
    ).toBe('m1.webp');
  });

  test('mimeType이 없으면 jpg로 폴백한다', () => {
    expect(downloadFilename({ id: 'm1', description: 'x' })).toBe('x.jpg');
  });

  test('지원하지 않는 mimeType이면 jpg로 폴백한다', () => {
    expect(
      downloadFilename({
        id: 'm1',
        description: 'x',
        mimeType: 'application/pdf',
      }),
    ).toBe('x.jpg');
  });

  test('image/jpg도 jpg로 매핑한다', () => {
    expect(
      downloadFilename({ id: 'm1', description: 'x', mimeType: 'image/jpg' }),
    ).toBe('x.jpg');
  });

  test('베이스명이 100자를 넘으면 자른다', () => {
    const long = 'a'.repeat(150);

    const result = downloadFilename({
      id: 'm1',
      description: long,
      mimeType: 'image/jpeg',
    });

    expect(result).toBe(`${'a'.repeat(100)}.jpg`);
  });
});
