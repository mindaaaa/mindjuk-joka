import { ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Photo } from '@/entities/photo';
import { useIntersection } from '@/shared/lib/hooks/use-intersection';
import { cn } from '@/shared/lib/utils/cn';
import { Skeleton } from '@/shared/ui/skeleton';

interface PhotoGridProps {
  photos: Photo[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  renderCard: (photo: Photo) => ReactNode;
  emptyAction?: ReactNode;
}

const COLUMN_COUNT = 2;
const MASONRY_CLASS = 'flex gap-3';
const COLUMN_CLASS = 'flex flex-1 flex-col gap-3 min-w-0';

// 라운드로빈으로 열에 나눠 담아 행 우선 읽기 순서 유지
// [0,1,2,3,4,5] → [[0,2,4],[1,3,5]]
function toColumns<T>(items: T[], columns: number): T[][] {
  const buckets: T[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, i) => buckets[i % columns]!.push(item));
  return buckets;
}

// 메이슨리 느낌의 스켈레톤(높이 제각각)
const SKELETON_HEIGHTS = ['h-40', 'h-56', 'h-44', 'h-64', 'h-48', 'h-52'];

function GridSkeleton({ count = 12 }: { count?: number }) {
  const columns = toColumns(
    Array.from({ length: count }, (_, i) => i),
    COLUMN_COUNT,
  );
  return (
    <div className={MASONRY_CLASS}>
      {columns.map((col, c) => (
        <div key={c} className={COLUMN_CLASS}>
          {col.map((i) => (
            <Skeleton
              key={i}
              className={cn(
                'w-full rounded-2xl bg-black/5 dark:bg-white/5',
                SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length],
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ action }: { action?: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <ImageIcon
        className="size-16 text-foreground opacity-10"
        strokeWidth={1.5}
        aria-hidden
      />
      <p className="text-[15px] text-foreground opacity-40">
        아직 올라온 사진이 없어요
      </p>
      {action}
    </div>
  );
}

export function PhotoGrid({
  photos,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderCard,
  emptyAction,
}: PhotoGridProps) {
  const sentinelRef = useIntersection(onLoadMore, {
    enabled: hasNextPage && !isFetchingNextPage,
  });

  if (isLoading) return <GridSkeleton />;
  if (photos.length === 0) return <EmptyState action={emptyAction} />;

  return (
    <div className="space-y-3">
      <div className={MASONRY_CLASS}>
        {toColumns(photos, COLUMN_COUNT).map((col, c) => (
          <div key={c} className={COLUMN_CLASS}>
            {col.map((photo) => renderCard(photo))}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} aria-hidden className="h-8" />
      {isFetchingNextPage && <GridSkeleton count={4} />}
    </div>
  );
}
