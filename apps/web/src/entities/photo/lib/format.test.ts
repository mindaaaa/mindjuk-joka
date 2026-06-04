import { describe, expect, test } from 'vitest';

import { formatBytes, formatDateTime } from './format';

describe('formatBytes', () => {
  test('단위를 올려가며 표기한다', () => {
    expect(formatBytes(512)).toBe('512B');
    expect(formatBytes(2048)).toBe('2KB');
    expect(formatBytes(1_500_000)).toBe('1.4MB');
  });

  test('B↔KB 경계를 정확히 가른다', () => {
    expect(formatBytes(1023)).toBe('1023B');
    expect(formatBytes(1024)).toBe('1KB');
    expect(formatBytes(1048576)).toBe('1MB');
  });

  test('바이트는 정수, KB 이상은 소수 첫째 자리로 반올림한다', () => {
    expect(formatBytes(1)).toBe('1B');
    expect(formatBytes(1536)).toBe('1.5KB');
    expect(formatBytes(1100)).toBe('1.1KB');
  });

  test('GB를 상한으로 둔다(그 이상도 GB로 표기)', () => {
    expect(formatBytes(5 * 1024 ** 3)).toBe('5GB');
    expect(formatBytes(2 * 1024 ** 4)).toBe('2048GB');
  });

  test('없거나 유효하지 않거나 0 이하면 -', () => {
    expect(formatBytes(undefined)).toBe('-');
    expect(formatBytes(0)).toBe('-');
    expect(formatBytes(-100)).toBe('-');
    expect(formatBytes(NaN)).toBe('-');
    expect(formatBytes(Infinity)).toBe('-');
  });
});

describe('formatDateTime', () => {
  test('유효한 ISO를 ko-KR 표기로 포맷한다', () => {
    const formatted = formatDateTime('2026-01-01T00:00:00.000Z');

    expect(formatted).not.toBe('2026-01-01T00:00:00.000Z');
    expect(formatted).toContain('2026');
  });

  test('파싱 실패 시 원본을 반환한다', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
    expect(formatDateTime('')).toBe('');
  });
});
