import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

import { useUploadQueueStore } from '../model/store';
import type { UploadQueueItem } from '../model/types';

import { UploadProgress } from './upload-progress';

interface UploadItemProps {
  item: UploadQueueItem;
  onCancel?: (id: string) => void;
}

const statusLabel: Record<UploadQueueItem['status'], string> = {
  pending: '대기',
  uploading: '업로드 중',
  success: '완료',
  error: '실패',
};

export function UploadItem({ item, onCancel }: UploadItemProps) {
  const updateDescription = useUploadQueueStore((s) => s.updateDescription);
  const remove = useUploadQueueStore((s) => s.remove);
  const setStatus = useUploadQueueStore((s) => s.setStatus);

  const isPending = item.status === 'pending';
  const isUploading = item.status === 'uploading';
  const isError = item.status === 'error';

  function retry() {
    setStatus(item.id, {
      status: 'pending',
      step: undefined,
      errorMessage: undefined,
    });
  }

  function handleRemove() {
    if (isUploading && onCancel) {
      onCancel(item.id);
      return;
    }
    remove(item.id);
  }

  return (
    <div className="flex items-start gap-3 rounded-md border bg-card p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {item.file.name}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {statusLabel[item.status]}
          </span>
        </div>
        <Input
          value={item.description}
          onChange={(e) => updateDescription(item.id, e.target.value)}
          placeholder="남기고 싶은 말을 적어보세요"
          disabled={!isPending}
          maxLength={120}
        />
        <UploadProgress value={item.progress} />
        {isError && item.errorMessage ? (
          <p className="text-xs text-destructive">{item.errorMessage}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {isError ? (
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            재시도
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
          {isUploading ? '취소' : '삭제'}
        </Button>
      </div>
    </div>
  );
}
