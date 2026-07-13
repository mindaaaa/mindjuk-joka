import { describe, expect, test } from 'vitest';

import {
  isPullTriggered,
  isVerticalPull,
  PULL_MAX_DISTANCE,
  PULL_TRIGGER_DISTANCE,
  pullDistance,
} from './pull';

describe('isVerticalPull', () => {
  test('아래로 향하고 세로 이동이 더 크면 당김이다', () => {
    expect(isVerticalPull(10, 40)).toBe(true);
  });

  test('위로 향하면 당김이 아니다(일반 스크롤)', () => {
    expect(isVerticalPull(0, -40)).toBe(false);
  });

  test('가로 이동이 더 크면 당김이 아니다(가로 스와이프)', () => {
    expect(isVerticalPull(-50, 20)).toBe(false);
  });
});

describe('pullDistance', () => {
  test('저항이 적용돼 손가락 이동보다 적게 따라온다', () => {
    expect(pullDistance(100)).toBe(50);
  });

  test('아무리 당겨도 상한을 넘지 않는다', () => {
    expect(pullDistance(10_000)).toBe(PULL_MAX_DISTANCE);
  });

  test('위로 올리면 0이다', () => {
    expect(pullDistance(-30)).toBe(0);
  });
});

describe('isPullTriggered', () => {
  test('임계값에 정확히 닿으면 발동한다', () => {
    expect(isPullTriggered(PULL_TRIGGER_DISTANCE)).toBe(true);
  });

  test('임계값에 못 미치면 발동하지 않는다', () => {
    expect(isPullTriggered(PULL_TRIGGER_DISTANCE - 1)).toBe(false);
  });
});
