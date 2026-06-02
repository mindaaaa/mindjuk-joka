import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { useAlbumStore } from '@/entities/album';
import {
  PhotoMeta,
  selectPhotos,
  useDeletePhotoMutation,
  usePhotoDetail,
  usePhotosInfinite,
  type Photo,
} from '@/entities/photo';

import { canWriteMeta, useAuthRole, useAuthUser } from '@/features/auth';
import { DownloadButton } from '@/features/photo-download';
import { EditMetaForm } from '@/features/photo-edit-meta';
import { usePhotoSortStore } from '@/features/photo-sort';

import { ApiError } from '@/shared/api/error';
import { recordForbidden } from '@/shared/lib/business-ux-logging';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toast';

/**
 * 현재 정렬 순서에 맞는 목록 캐시에서 이전/다음 사진 id를 계산한다.
 *
 * - 목록을 새로 요청하지 않고({ enabled: false }) 이미 로드된 캐시만 읽는다.
 * - 목록을 거쳐 들어온 경우 인접 사진으로 이동할 수 있다.
 * - 직접 진입(캐시 없음)이거나 목록에 없는 id면 prev/next 모두 undefined → 버튼 비활성.
 *
 * @param currentId - 현재 보고 있는 사진 id.
 * @returns 이전/다음 사진 id. 없으면 각각 undefined.
 */
function usePrevNext(currentId: string) {
  const order = usePhotoSortStore((s) => s.order);
  const { data } = usePhotosInfinite(
    { sortBy: 'createdAt', order },
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

export function PhotoDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const albumId = useAlbumStore((s) => s.current?.id);
  const user = useAuthUser();

  const query = usePhotoDetail(id, { enabled: !!albumId });
  const photo = query.data;
  const { prevId, nextId } = usePrevNext(id);

  if (query.isLoading || !photo) {
    return <DetailSkeleton />;
  }

  const canWrite = canWriteMeta(user?.role, photo.createdBy.id, user?.id);

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/photos')}>
          <ArrowLeft className="size-4" />
          목록
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevId}
            onClick={() => prevId && navigate(`/photos/${prevId}`)}
          >
            <ChevronLeft className="size-4" />
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextId}
            onClick={() => nextId && navigate(`/photos/${nextId}`)}
          >
            다음
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden rounded-lg bg-muted">
        {photo.imageUrl && (
          <img
            src={photo.imageUrl}
            alt={photo.description}
            className="max-h-[70vh] w-auto object-contain"
          />
        )}
      </div>

      <ErrorBoundary fallback={<MetaErrorFallback />}>
        <div className="space-y-4">
          <EditMetaForm photo={photo} canEdit={canWrite} />
          <PhotoMeta photo={photo} />
        </div>
      </ErrorBoundary>

      <div className="flex items-center justify-between">
        <DownloadButton photo={photo} variant="secondary" />
        {canWrite && <DeletePhotoButton photo={photo} />}
      </div>
    </section>
  );
}

function DeletePhotoButton({ photo }: { photo: Photo }) {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [open, setOpen] = useState(false);
  const mutation = useDeletePhotoMutation();

  const handleDelete = () => {
    mutation.mutate(photo.id, {
      onSuccess: () => {
        toast.success('사진을 삭제했어요.');
        navigate('/photos');
      },

      onError: (err) => {
        if (err instanceof ApiError && err.status === 403) {
          recordForbidden({
            userRole: role ?? 'unknown',
            operationId: 'deleteMedia',
          });
          toast.error('삭제 권한이 없어요.');
        } else {
          toast.error('삭제에 실패했어요.');
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="size-4" />
          삭제
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사진을 삭제할까요?</DialogTitle>
          <DialogDescription>삭제한 사진은 되돌릴 수 없어요.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '삭제 중…' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}

function MetaErrorFallback() {
  return (
    <Alert variant="destructive">
      <AlertTitle>이 영역을 불러오지 못했어요</AlertTitle>
      <AlertDescription>
        사진 정보를 표시하는 중 문제가 발생했어요.
      </AlertDescription>
    </Alert>
  );
}
