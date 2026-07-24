import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import {
  useAlbums,
  useAlbumStore,
  useCurrentAlbumRole,
} from '@/entities/album';
import {
  PhotoCard,
  selectPhotos,
  usePhotosInfinite,
  useRefreshPhotoUrls,
  type Photo,
} from '@/entities/photo';
import { canUpload, useAuthErrorRedirect } from '@/features/auth';
import {
  DownloadButton,
  downloadFilename,
  downloadMany,
} from '@/features/photo-download';
import { PullToRefresh } from '@/features/photo-refresh';
import {
  SelectCheckbox,
  useIsSelected,
  usePhotoSelectStore,
  useSelectEnabled,
  useSelectedIds,
} from '@/features/photo-select';
import { SortSheet, usePhotoSortStore } from '@/features/photo-sort';
import { ApiError } from '@/shared/api/error';
import { track } from '@/shared/lib/analytics';
import { recordForbidden } from '@/shared/lib/business-ux-logging';
import { errorFallbackMessage } from '@/shared/lib/error-fallback';
import { log } from '@/shared/lib/logger';
import { cn } from '@/shared/lib/utils/cn';
import { ErrorState } from '@/shared/ui/error-state';
import { toast } from '@/shared/ui/toast';
import { PhotoGrid } from '@/widgets/photo-grid';
import { SelectionBar } from '@/widgets/selection-bar';

interface BatchDownloadResult {
  ok: number;
  failed: number;
  errors: unknown[];
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

function allFailMessage(errors: unknown[]): string {
  const all403 = errors.every((e) => e instanceof ApiError && e.status === 403);
  if (all403) {
    return '다운로드 링크가 만료됐어요. 새로고침 후 다시 시도해 주세요.';
  }

  const allNetwork = errors.every(
    (e) => e instanceof ApiError && e.status === 0,
  );
  if (allNetwork) {
    return '네트워크 연결을 확인하고 다시 시도해 주세요.';
  }

  return '다운로드에 실패했어요. 잠시 후 다시 시도해 주세요.';
}

export function PhotoListPage() {
  const navigate = useNavigate();
  const role = useCurrentAlbumRole();

  const order = usePhotoSortStore((s) => s.order);
  const enabled = useSelectEnabled();
  const selectedIds = useSelectedIds();

  const [favorite, setFavorite] = useState(false);

  const albumId = useAlbumStore((s) => s.current?.id);

  const albumsQuery = useAlbums();
  const albumsSettled = albumsQuery.isSuccess || albumsQuery.isError;

  const query = usePhotosInfinite(
    { sortBy: 'createdAt', order, ...(favorite && { isFavorite: true }) },
    { enabled: !!albumId },
  );
  const photos = selectPhotos(query.data);

  useEffect(() => {
    track('list.view');
  }, []);

  const pagesLoaded = query.data?.pages.length ?? 0;
  useEffect(() => {
    if (pagesLoaded > 1) {
      track('list.scroll_depth', { pagesLoaded });
    }
  }, [pagesLoaded]);

  const { downloading, run: runBatchDownload } = useBatchDownload(
    photos,
    selectedIds,
    role,
  );

  const handleBatchDownload = async () => {
    track('download.bulk_start', { count: selectedIds.size });

    const result = await runBatchDownload();
    if (!result) return;

    const { ok, failed, errors } = result;

    if (failed === 0) {
      track('download.bulk_success', { ok });
      toast.success(`${ok}장 다운로드 완료`);
    } else if (ok === 0) {
      track('download.bulk_fail', { failed });
      toast.error(allFailMessage(errors));
    } else {
      track('download.bulk_success', { ok, failed });
      toast.warning(`${ok}장 완료 · ${failed}장 실패`);
    }
  };

  return (
    <section
      className={`mx-auto max-w-5xl space-y-4 px-4 pt-4 ${enabled ? 'pb-24' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <FilterTabs
          active={favorite ? 'favorite' : 'all'}
          onChange={(key) => setFavorite(key === 'favorite')}
        />
        <SortSheet />
      </div>

      <ErrorBoundary fallback={(error) => <GridErrorFallback error={error} />}>
        <PullToRefresh>
          <PhotoGrid
            photos={photos}
            isLoading={!albumsSettled || query.isLoading}
            isFetchingNextPage={query.isFetchingNextPage}
            hasNextPage={!!query.hasNextPage}
            onLoadMore={() => query.fetchNextPage()}
            emptyAction={
              canUpload(role) ? (
                <Link
                  to="/upload"
                  className="text-[14px] text-foreground opacity-30 transition-opacity hover:opacity-100"
                >
                  사진 올리기
                </Link>
              ) : undefined
            }
            renderCard={(photo) => (
              <GridCard
                key={photo.id}
                photo={photo}
                onOpen={(id) =>
                  navigate(`/photos/${id}`, {
                    state: { source: 'grid', favorite },
                  })
                }
              />
            )}
          />
        </PullToRefresh>
      </ErrorBoundary>

      <SelectionBar
        onDownload={handleBatchDownload}
        isDownloading={downloading}
      />
    </section>
  );
}

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'favorite', label: '즐겨찾기' },
] as const;

type FilterKey = (typeof TABS)[number]['key'];

function FilterTabs({
  active,
  onChange,
}: {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}) {
  return (
    <nav className="flex items-center gap-8" aria-label="사진 필터">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(tab.key)}
            className={cn(
              'text-[22px] tracking-tight',
              isActive ? 'text-primary' : 'text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

// 401/403이면 로그인으로 리다이렉트, 그 외엔 에러 풀백 표시
function GridErrorFallback({ error }: { error: unknown }) {
  const redirecting = useAuthErrorRedirect(error);
  if (redirecting) return null;

  return (
    <ErrorState
      title="사진을 불러오지 못했어요"
      description={errorFallbackMessage(error)}
      retry={{ label: '다시 시도', onClick: () => window.location.reload() }}
    />
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
  const refreshPhotoUrls = useRefreshPhotoUrls();

  const handleThumbnailError = async (attempt: number) => {
    log.bug(new Error('thumbnail load failed'), {
      operationId: 'thumbnailLoad',
      photoId: photo.id,
      attempt,
    });

    if (attempt > 1) return undefined;

    try {
      const refreshed = await refreshPhotoUrls(photo.id);
      return refreshed.thumbnailUrl;
    } catch {
      return undefined; // 새 URL도 못 받으면 실패로 확정
    }
  };

  return (
    <PhotoCard
      photo={photo}
      selected={enabled && selected}
      selectionSlot={enabled ? <SelectCheckbox id={photo.id} /> : undefined}
      actionSlot={!enabled ? <DownloadButton photo={photo} /> : undefined}
      onOpen={(id) => (enabled ? toggle(id) : onOpen(id))}
      onThumbnailError={handleThumbnailError}
    />
  );
}
