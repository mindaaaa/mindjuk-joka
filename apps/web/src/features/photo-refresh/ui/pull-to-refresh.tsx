import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { useRefreshPhotos } from '../model/use-refresh-photos';

import { PULL_TRIGGER_DISTANCE } from '@/shared/lib/gesture/pull';
import { usePullToRefresh } from '@/shared/lib/hooks/use-pull-to-refresh';
import { cn } from '@/shared/lib/utils/cn';

/** 인디케이터가 화면 밖(위)에 대기하는 높이. 당긴 만큼 내려온다. */
const INDICATOR_PARKED_OFFSET = 40;

/**
 * 목록을 감싸 당겨서 새로고침을 붙인다.
 *
 * - iOS standalone엔 당겨서 새로고침이 없어 제스처·인디케이터를 직접 구현
 * - 헤더 버튼과 진행 상태를 공유하므로, 어느 쪽으로 시작해도 둘 다 진행 중으로 표시
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const { isRefreshing, refresh } = useRefreshPhotos();
  const { distance, isDragging } = usePullToRefresh({
    onRefresh: () => void refresh('pull'),
    enabled: !isRefreshing,
  });

  const offset = isRefreshing ? PULL_TRIGGER_DISTANCE : distance;
  const progress = Math.min(offset / PULL_TRIGGER_DISTANCE, 1);
  const settle = isDragging ? undefined : 'transition-transform duration-200';

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{
          transform: `translateY(${offset - INDICATOR_PARKED_OFFSET}px)`,
          opacity: progress,
        }}
      >
        <span className="rounded-full border border-border bg-background p-2 shadow-sm">
          <RefreshCw
            className={cn('size-4', isRefreshing && 'animate-spin')}
            style={
              // 당긴 진행도만큼 회전, 반 바퀴(180°) 돌면 손을 떼도 된다는 신호.
              isRefreshing
                ? undefined
                : { transform: `rotate(${progress * 180}deg)` }
            }
          />
        </span>
      </div>

      <div className={settle} style={{ transform: `translateY(${offset}px)` }}>
        {children}
      </div>
    </div>
  );
}
