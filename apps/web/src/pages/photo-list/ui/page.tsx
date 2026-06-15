import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { useAlbumStore, useCurrentAlbumRole } from '@/entities/album';
import {
  PhotoCard,
  selectPhotos,
  usePhotosInfinite,
  type Photo,
} from '@/entities/photo';
import { canUpload, useAuthErrorRedirect } from '@/features/auth';
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
import { errorFallbackMessage } from '@/shared/lib/error-fallback';
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

  const handleBatchDownload = async () => {
    const result = await runBatchDownload();
    if (!result) return;

    const { ok, failed, errors } = result;

    if (failed === 0) {
      toast.success(`${ok}장 다운로드 완료`);
    } else if (ok === 0) {
      toast.error(allFailMessage(errors));
    } else {
      toast.warning(`${ok}장 완료 · ${failed}장 실패`);
    }
  };

  return (
    <section
      className={`mx-auto max-w-5xl space-y-4 px-4 pt-4 ${enabled ? 'pb-24' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <FilterTabs />
        <SortSheet />
      </div>

      <ErrorBoundary fallback={(error) => <GridErrorFallback error={error} />}>
        <PhotoGrid
          photos={photos}
          isLoading={!albumId || query.isLoading}
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
