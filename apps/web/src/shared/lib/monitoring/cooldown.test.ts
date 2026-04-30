import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { COOLDOWN_MS, isInCooldown, setCooldown } from './cooldown';

const STORAGE_KEY = 'joka:monitoring:log_cooldown';

describe('cooldown', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('isInCooldown은 한 번도 setCooldown되지 않은 fingerprint에 대해 false를 뱉는다', () => {
    expect(isInCooldown('confirmMedia-abc')).toBe(false);
  });

  test('isInCooldown은 setCooldown 직후 같은 fingerprint에 대해 true를 뱉는다', () => {
    setCooldown('confirmMedia-abc');

    expect(isInCooldown('confirmMedia-abc')).toBe(true);
  });

  test('isInCooldown은 COOLDOWN_MS가 경과한 fingerprint에 대해 false를 뱉는다', () => {
    setCooldown('confirmMedia-abc');
    vi.advanceTimersByTime(COOLDOWN_MS + 1);

    expect(isInCooldown('confirmMedia-abc')).toBe(false);
  });

  test('setCooldown은 다른 fingerprint의 쿨다운 상태에는 영향을 주지 않을 수 있다', () => {
    setCooldown('confirmMedia-abc');

    expect(isInCooldown('confirmMedia-xyz')).toBe(false);
  });

  test('setCooldown은 fingerprint별 만료 시각을 sessionStorage에 저장할 수 있다', () => {
    setCooldown('confirmMedia-abc');

    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string) as Record<string, number>;
    expect(parsed['confirmMedia-abc']).toBe(Date.now() + COOLDOWN_MS);
  });

  test('isInCooldown은 sessionStorage에 깨진 JSON이 들어 있는 상황에서도 false를 뱉는다', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not-json');

    expect(isInCooldown('confirmMedia-abc')).toBe(false);
  });

  test('setCooldown은 만료된 다른 fingerprint를 정리하면서 새 항목을 저장할 수 있다', () => {
    setCooldown('expired-fingerprint');
    vi.advanceTimersByTime(COOLDOWN_MS + 1);
    setCooldown('fresh-fingerprint');

    const parsed = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) as string,
    ) as Record<string, number>;

    expect(parsed['expired-fingerprint']).toBeUndefined();
    expect(parsed['fresh-fingerprint']).toBe(Date.now() + COOLDOWN_MS);
  });

  test('setCooldown은 같은 fingerprint를 다시 호출하는 상황에서 만료 시각을 갱신할 수 있다', () => {
    setCooldown('confirmMedia-abc');
    vi.advanceTimersByTime(60_000);
    setCooldown('confirmMedia-abc');

    const parsed = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) as string,
    ) as Record<string, number>;

    expect(parsed['confirmMedia-abc']).toBe(Date.now() + COOLDOWN_MS);
  });
});
