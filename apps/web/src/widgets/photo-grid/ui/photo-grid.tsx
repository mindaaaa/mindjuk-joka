import type { ReactNode } from 'react';

import type { Photo } from '@/entities/photo';
import { useIntersection } from '@/shared/lib/hooks/use-intersection';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';

interface PhotoGridProps {
  photos: Photo[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  renderCard: (photo: Photo) => ReactNode;
}

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square rounded-md" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Alert className="mx-auto max-w-md text-center">
      <AlertTitle>아직 사진이 없어요</AlertTitle>
      <AlertDescription>사진을 업로드하면 이곳에 표시됩니다.</AlertDescription>
    </Alert>
  );
}

export function PhotoGrid({
  photos,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderCard,
}: PhotoGridProps) {
  const sentinelRef = useIntersection(onLoadMore, {
    enabled: hasNextPage && !isFetchingNextPage,
  });

  if (isLoading) return <GridSkeleton />;
  if (photos.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      <div className={GRID_CLASS}>{photos.map(renderCard)}</div>
      <div ref={sentinelRef} aria-hidden className="h-8" />
      {isFetchingNextPage && <GridSkeleton count={4} />}
    </div>
  );
}
