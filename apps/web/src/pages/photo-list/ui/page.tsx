import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { useAlbumStore } from '@/entities/album';
import {
  PhotoCard,
  selectPhotos,
  usePhotosInfinite,
  type Photo,
} from '@/entities/photo';
import { useAuthRole } from '@/features/auth';
import {
  DownloadButton,
  downloadFilename,
  downloadMany,
} from '@/features/photo-download';
import {
  SelectCheckbox,
  useIsSelected,
  usePhotoSelectStore,
  useSelectEnabled,
  useSelectedIds,
} from '@/features/photo-select';
import { SortSheet, usePhotoSortStore } from '@/features/photo-sort';

import { ApiError } from '@/shared/api/error';
import { recordForbidden } from '@/shared/lib/business-ux-logging';
import { cn } from '@/shared/lib/utils/cn';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

import { PhotoGrid } from '@/widgets/photo-grid';
import { SelectionBar } from '@/widgets/selection-bar';

interface BatchDownloadResult {
  ok: number;
  failed: number;
}

function useBatchDownload(
  photos: Photo[],
  selectedIds: Set<string>,
  role: string | undefined,
) {
  const [downloading, setDownloading] = useState(false);

  const run = async (): Promise<BatchDownloadResult | null> => {
    const targets = photos
      .filter((photo) => selectedIds.has(photo.id) && photo.downloadUrl)
      .map((photo) => ({
        url: photo.downloadUrl!,
        filename: downloadFilename(photo),
      }));

    if (targets.length === 0) return null;

    setDownloading(true);

    const result = await downloadMany(targets, {
      onError: (_, err) => {
        if (err instanceof ApiError && err.status === 403) {
          recordForbidden({
            userRole: role ?? 'unknown',
            operationId: 'downloadMedia',
          });
        }
      },
    });

    setDownloading(false);

    return result;
  };

  return { downloading, run };
}

export function PhotoListPage() {
  const navigate = useNavigate();
  const role = useAuthRole();

  const order = usePhotoSortStore((s) => s.order);
  const enabled = useSelectEnabled();
  const selectedIds = useSelectedIds();
  const clearSelection = usePhotoSelectStore((s) => s.clear);

  const albumId = useAlbumStore((s) => s.current?.id);
  const query = usePhotosInfinite(
    { sortBy: 'createdAt', order },
    { enabled: !!albumId },
  );
  const photos = selectPhotos(query.data);

  const { downloading, run: runBatchDownload } = useBatchDownload(
    photos,
    selectedIds,
    role,
  );

  const prevOrder = useRef(order);
  useEffect(() => {
    if (prevOrder.current !== order) {
      prevOrder.current = order;
      clearSelection();
    }
  }, [order, clearSelection]);

  const handleBatchDownload = async () => {
    const result = await runBatchDownload();
    if (!result) return;

    const { ok, failed } = result;
    const message = `${ok}개 다운로드 완료${failed ? `, ${failed}개 실패` : ''}`;

    if (failed) toast.warning(message);
    else toast.success(message);
  };

  return (
    <section
      className={`mx-auto max-w-5xl space-y-4 px-4 pt-4 ${enabled ? 'pb-24' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <FilterTabs />
        <SortSheet />
      </div>

      <ErrorBoundary fallback={<GridErrorFallback />}>
        <PhotoGrid
          photos={photos}
          isLoading={!albumId || query.isLoading}
          isFetchingNextPage={query.isFetchingNextPage}
          hasNextPage={!!query.hasNextPage}
          onLoadMore={() => query.fetchNextPage()}
          renderCard={(photo) => (
            <GridCard
              key={photo.id}
              photo={photo}
              onOpen={(id) => navigate(`/photos/${id}`)}
            />
          )}
        />
      </ErrorBoundary>

      <SelectionBar
        onDownload={handleBatchDownload}
        isDownloading={downloading}
      />
    </section>
  );
}

const TABS = [
  { key: 'all', label: '전체', enabled: true },
  { key: 'recent', label: '최근', enabled: false },
  { key: 'favorite', label: '즐겨찾기', enabled: false },
] as const;

// TODO: 최근/즐겨찾기 필터 API 연결 (연결되면 active를 상태로 변경)
function FilterTabs() {
  const active = 'all';

  return (
    <nav className="flex items-center gap-8" aria-label="사진 필터">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            disabled={!tab.enabled}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'text-[22px] tracking-tight',
              isActive ? 'text-primary' : 'text-foreground',
              !tab.enabled && 'opacity-25',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function GridErrorFallback() {
  return (
    <Alert variant="destructive" className="mx-auto max-w-md text-center">
      <AlertTitle>이 영역을 불러오지 못했어요</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>사진 목록을 표시하는 중 문제가 발생했어요.</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          다시 시도
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function GridCard({
  photo,
  onOpen,
}: {
  photo: Photo;
  onOpen: (id: string) => void;
}) {
  const enabled = useSelectEnabled();
  const selected = useIsSelected(photo.id);
  const toggle = usePhotoSelectStore((s) => s.toggle);

  return (
    <PhotoCard
      photo={photo}
      selected={enabled && selected}
      selectionSlot={enabled ? <SelectCheckbox id={photo.id} /> : undefined}
      actionSlot={!enabled ? <DownloadButton photo={photo} /> : undefined}
      onOpen={(id) => (enabled ? toggle(id) : onOpen(id))}
    />
  );
}
