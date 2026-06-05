import type { ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';

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

// CSS 멀티컬럼 메이슨리: 2열, 카드 높이는 사진 비율대로 제각각.
const MASONRY_CLASS = 'columns-2 gap-3';
const ITEM_CLASS = 'mb-3 break-inside-avoid';

// 메이슨리 느낌의 스켈레톤(높이 제각각)
const SKELETON_HEIGHTS = ['h-40', 'h-56', 'h-44', 'h-64', 'h-48', 'h-52'];

function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={MASONRY_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'w-full rounded-2xl bg-black/5 dark:bg-white/5',
            ITEM_CLASS,
            SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length],
          )}
        />
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
        {photos.map((photo) => (
          <div key={photo.id} className={ITEM_CLASS}>
            {renderCard(photo)}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} aria-hidden className="h-8" />
      {isFetchingNextPage && <GridSkeleton count={4} />}
    </div>
  );
}
