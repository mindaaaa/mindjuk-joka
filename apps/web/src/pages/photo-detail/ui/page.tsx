import { ChevronLeft, ChevronRight, Heart, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { useAlbumStore, useCurrentAlbumRole } from '@/entities/album';
import {
  isAlreadyDeleted,
  PhotoMeta,
  PhotoProgressiveImage,
  selectPhotos,
  useDeletePhotoMutation,
  usePhotoDetail,
  usePhotosInfinite,
  useRefreshPhotoUrls,
  useToggleFavoriteMutation,
  type Photo,
} from '@/entities/photo';
import {
  canWriteMeta,
  useAuthErrorRedirect,
  useAuthUser,
} from '@/features/auth';
import { DownloadButton } from '@/features/photo-download';
import { EditMetaForm } from '@/features/photo-edit-meta';
import { usePhotoSortStore } from '@/features/photo-sort';
import { ApiError } from '@/shared/api/error';
import { track } from '@/shared/lib/analytics';
import { recordForbidden } from '@/shared/lib/business-ux-logging';
import { errorFallbackMessage } from '@/shared/lib/error-fallback';
import { log } from '@/shared/lib/logger';
import { cn } from '@/shared/lib/utils/cn';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toast';

/**
 * 진입한 목록과 같은 필터의 캐시에서 이전/다음 사진 id를 계산한다.
 *
 * - 목록을 새로 요청하지 않고({ enabled: false }) 이미 로드된 캐시만 읽는다.
 * - favorite은 진입한 목록의 필터를 그대로 따라가, 즐겨찾기 목록에서 들어오면
 *   인접 이동도 즐겨찾기 안에서만 이뤄진다(전체 목록과 캐시 키가 갈림).
 * - 직접 진입(캐시 없음)이거나 목록에 없는 id면 prev/next 모두 undefined → 버튼 비활성.
 *
 * @param currentId - 현재 보고 있는 사진 id.
 * @param favorite - 즐겨찾기 필터로 진입했는지.
 * @returns 이전/다음 사진 id. 없으면 각각 undefined.
 */
function usePrevNext(currentId: string, favorite: boolean) {
  const order = usePhotoSortStore((s) => s.order);
  const { data } = usePhotosInfinite(
    { sortBy: 'createdAt', order, ...(favorite && { isFavorite: true }) },
    { enabled: false },
  );

  const photos = selectPhotos(data);
  const index = photos.findIndex((photo) => photo.id === currentId);
  if (index === -1) {
    return { prevId: undefined, nextId: undefined };
  }

  return {
    prevId: photos[index - 1]?.id,
    nextId: photos[index + 1]?.id,
  };
}

/** 라우터 state에서 진입 경로(source)를 안전하게 읽는다. 없으면 'direct'. */
function readNavSource(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'source' in state &&
    typeof state.source === 'string'
  ) {
    return state.source;
  }
  return 'direct';
}

/** 라우터 state에서 즐겨찾기 목록 진입 여부를 안전하게 읽는다. */
function readNavFavorite(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'favorite' in state &&
    state.favorite === true
  );
}

export function PhotoDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { state } = useLocation();
  const source = readNavSource(state);
  const favorite = readNavFavorite(state);

  const albumId = useAlbumStore((s) => s.current?.id);
  const user = useAuthUser();
  const role = useCurrentAlbumRole();

  const query = usePhotoDetail(id, { enabled: !!albumId && !!id });
  const photo = query.data;
  const { prevId, nextId } = usePrevNext(id, favorite);
  const refreshPhotoUrls = useRefreshPhotoUrls();

  useEffect(() => {
    track('detail.view', { source });
  }, [id, source]);

  const handleImageError = async (attempt: number) => {
    log.bug(new Error('photo image load failed'), {
      operationId: 'photoImageLoad',
      photoId: id,
      attempt,
    });

    if (attempt > 1) return undefined; // 자동 재시도는 1회 (수동 버튼은 카운트를 되돌린다)

    try {
      const refreshed = await refreshPhotoUrls(id);
      return refreshed.imageUrl;
    } catch {
      return undefined; // 새 URL도 못 받으면 실패로 확정
    }
  };

  if (query.isLoading || !photo) {
    return <DetailSkeleton />;
  }

  const canWrite = canWriteMeta(role, photo.createdBy.id, user?.id);

  return (
    <section className="mx-auto max-w-2xl space-y-6 p-6">
      <DetailHeader photo={photo} canWrite={canWrite} />

      {/* 이미지 뷰어 스테이지: 다크 배경 + object-contain + 좌우 네비 화살표 */}
      {/* 3단계 progressive: blurhash → 썸네일(캐시) → 원본 */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-black">
        {photo.imageUrl && (
          <PhotoProgressiveImage
            src={photo.imageUrl}
            previewSrc={photo.thumbnailUrl}
            blurhash={photo.blurhash}
            alt={photo.description}
            onLoadError={handleImageError}
          />
        )}

        <NavArrow direction="prev" targetId={prevId} favorite={favorite} />
        <NavArrow direction="next" targetId={nextId} favorite={favorite} />
      </div>

      <ErrorBoundary fallback={(error) => <MetaErrorFallback error={error} />}>
        <div className="space-y-4">
          <EditMetaForm photo={photo} canEdit={canWrite} />
          <PhotoMeta photo={photo} />
        </div>
      </ErrorBoundary>
    </section>
  );
}

function DetailHeader({
  photo,
  canWrite,
}: {
  photo: Photo;
  canWrite: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-1">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="닫기"
        onClick={() => navigate('/photos')}
      >
        <X className="size-6" />
      </Button>
      <div className="flex items-center gap-1">
        <FavoriteButton photo={photo} />
        <DownloadButton photo={photo} variant="ghost" size="icon" />
        {canWrite && <DeletePhotoButton photo={photo} />}
      </div>
    </div>
  );
}

function FavoriteButton({ photo }: { photo: Photo }) {
  const mutation = useToggleFavoriteMutation();

  const handleToggle = () => {
    mutation.mutate(
      { id: photo.id, isFavorite: !photo.isFavorite },
      { onError: () => toast.error('즐겨찾기 변경에 실패했어요.') },
    );
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label="즐겨찾기"
      aria-pressed={photo.isFavorite}
      disabled={mutation.isPending}
      onClick={handleToggle}
    >
      <Heart className={photo.isFavorite ? 'fill-primary text-primary' : ''} />
    </Button>
  );
}

function NavArrow({
  direction,
  targetId,
  favorite,
}: {
  direction: 'prev' | 'next';
  targetId: string | undefined;
  favorite: boolean;
}) {
  const navigate = useNavigate();
  const isPrev = direction === 'prev';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isPrev ? '이전' : '다음'}
      disabled={!targetId}
      onClick={() =>
        targetId &&
        navigate(`/photos/${targetId}`, {
          state: { source: 'nav', favorite },
        })
      }
      className={cn(
        'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white',
        isPrev ? 'left-2' : 'right-2',
      )}
    >
      {isPrev ? (
        <ChevronLeft className="size-6" />
      ) : (
        <ChevronRight className="size-6" />
      )}
    </Button>
  );
}

function DeletePhotoButton({ photo }: { photo: Photo }) {
  const navigate = useNavigate();
  const role = useCurrentAlbumRole();
  const [open, setOpen] = useState(false);
  const mutation = useDeletePhotoMutation();

  const handleDelete = () => {
    mutation.mutate(photo.id, {
      onSuccess: () => {
        toast.success('사진을 삭제했어요.');
        navigate('/photos');
      },

      onError: (err) => {
        if (isAlreadyDeleted(err)) {
          toast.info('이미 삭제된 사진이에요.');
          navigate('/photos');
          return;
        }

        if (err instanceof ApiError && err.status === 403) {
          recordForbidden({
            userRole: role ?? 'unknown',
            operationId: 'deleteMedia',
          });
          toast.error('삭제 권한이 없어요.');
          return;
        }

        toast.error('삭제에 실패했어요.');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-destructive hover:text-destructive"
          aria-label="삭제"
        >
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent
        showClose={false}
        overlayClassName="bg-black/40"
        className="max-w-70 gap-6 rounded-2xl p-6 sm:rounded-2xl"
      >
        <DialogTitle className="text-center text-base font-medium">
          사진을 삭제할까요?
        </DialogTitle>
        <DialogDescription className="sr-only">
          삭제한 사진은 되돌릴 수 없어요.
        </DialogDescription>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-11 flex-1 rounded-[10px]"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            className="h-11 flex-1 rounded-[10px]"
            onClick={handleDelete}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '삭제 중…' : '삭제'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <section className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}

function MetaErrorFallback({ error }: { error: unknown }) {
  const redirecting = useAuthErrorRedirect(error);
  if (redirecting) {
    return null;
  }

  return (
    <ErrorState
      title="사진 정보를 불러오지 못했어요"
      description={errorFallbackMessage(error)}
      retry={{ label: '다시 시도', onClick: () => window.location.reload() }}
    />
  );
}
