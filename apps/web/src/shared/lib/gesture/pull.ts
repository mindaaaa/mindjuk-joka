/** 이 거리(px) 이상 당겼다 놓으면 새로고침이 발동한다. */
export const PULL_TRIGGER_DISTANCE = 72;

export function isPullTriggered(distance: number): boolean {
  return distance >= PULL_TRIGGER_DISTANCE;
}

/** 아무리 당겨도 인디케이터가 내려오는 최대 거리(px). */
export const PULL_MAX_DISTANCE = 96;

/** 손가락 이동 대비 화면이 따라오는 비율. 1이면 손끝에 딱 붙어 너무 쉽게 발동한다. */
const PULL_RESISTANCE = 0.5;

/** 가로 스와이프를 세로 당김으로 오인하지 않게 한다. */
export function isVerticalPull(deltaX: number, deltaY: number): boolean {
  return deltaY > 0 && deltaY > Math.abs(deltaX);
}

/**
 * 손가락이 움직인 거리를 화면에 보여줄 당김 거리로 줄여준다.
 * - 손가락 절반만큼만 화면이 따라오고(저항)
 * - 아무리 당겨도 96px을 넘지 않는다(상한)
 * @example 손가락을 144px 당기면 화면은 72px만 내려간다.
 */
export function pullDistance(deltaY: number): number {
  if (deltaY <= 0) return 0;
  return Math.min(deltaY * PULL_RESISTANCE, PULL_MAX_DISTANCE);
}
