import { useEffect, useRef, useState } from 'react';

import {
  isPullTriggered,
  isVerticalPull,
  pullDistance,
} from '@/shared/lib/gesture/pull';

interface UsePullToRefreshOptions {
  onRefresh: () => void;
  /** 이미 새로고침 중이면 꺼서 제스처를 받지 않는다. */
  enabled?: boolean;
}

interface PullState {
  distance: number;
  isDragging: boolean;
}

/** 문서가 최상단일 때만 당김을 시작한다. */
function isAtTop(): boolean {
  return window.scrollY <= 0;
}

/**
 * 문서 스크롤 기준 당겨서 새로고침.
 *
 * - window에 직접 리스너를 등록한다 (React onTouchMove는 passive 지정 불가)
 * - touchmove는 passive: false로 등록해 preventDefault로 브라우저 바운스를 막는다
 * - 그 위에 우리가 그린 인디케이터만 움직인다
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
}: UsePullToRefreshOptions): PullState {
  const [distance, setDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const originRef = useRef<{ x: number; y: number } | null>(null);
  const distanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      originRef.current = null;
      distanceRef.current = 0;
      setDistance(0);
      setIsDragging(false);
    };

    const handleStart = (event: TouchEvent) => {
      // 핀치 줌 등 멀티터치는 당김이 아니다.
      if (event.touches.length !== 1 || !isAtTop()) {
        originRef.current = null;
        return;
      }

      const touch = event.touches[0]!;
      originRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleMove = (event: TouchEvent) => {
      const origin = originRef.current;
      const touch = event.touches[0];
      if (!origin || !touch) return;

      // 당기는 도중 손가락이 늘면(핀치 줌) touches[0]이 추적하던 손가락이 아닐 수 있다.
      if (event.touches.length !== 1) {
        reset();
        return;
      }

      // 당기는 도중 최상단을 벗어났다면 일반 스크롤로 돌려준다.
      if (!isAtTop()) {
        reset();
        return;
      }

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;

      // 되돌리거나 가로로 긋는 중이면 인디케이터만 접고 추적은 유지한다.
      // isDragging도 함께 꺼야 접히는 동안 transition이 살아나 툭 끊기지 않는다.
      if (!isVerticalPull(deltaX, deltaY)) {
        distanceRef.current = 0;
        setDistance(0);
        setIsDragging(false);
        return;
      }

      event.preventDefault();

      distanceRef.current = pullDistance(deltaY);
      setDistance(distanceRef.current);
      setIsDragging(true);
    };

    const handleEnd = () => {
      const triggered = isPullTriggered(distanceRef.current);
      reset();

      if (triggered) onRefreshRef.current();
    };

    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      reset();
    };
  }, [enabled]);

  return { distance, isDragging };
}
