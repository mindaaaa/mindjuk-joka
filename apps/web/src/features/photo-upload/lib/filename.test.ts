import { describe, expect, test } from 'vitest';

import { stripExtension } from './filename';

describe('stripExtension', () => {
  test('일반 파일', () => {
    expect(stripExtension('photo.jpg')).toBe('photo');
  });

  test('다중 dot 은 마지막만 제거', () => {
    expect(stripExtension('my.photo.jpg')).toBe('my.photo');
  });

  test('확장자 없음은 그대로', () => {
    expect(stripExtension('photo')).toBe('photo');
  });

  test('dotfile (.gitignore) 은 그대로', () => {
    expect(stripExtension('.gitignore')).toBe('.gitignore');
  });
});
