import { useEffect, useState } from 'react';
import { ImageIcon, RefreshCw, X } from 'lucide-react';

import { cn } from '@/shared/lib/utils/cn';

import { useUploadQueueStore } from '../model/store';
import type { UploadQueueItem } from '../model/types';

interface UploadItemProps {
  item: UploadQueueItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function UploadItem({
  item,
  selected,
  onSelect,
  onCancel,
}: UploadItemProps) {
  const remove = useUploadQueueStore((s) => s.remove);
  const setStatus = useUploadQueueStore((s) => s.setStatus);

  const [previewUrl] = useState(() => URL.createObjectURL(item.file));
  const [imgError, setImgError] = useState(false);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

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
    <div className="flex w-24 shrink-0 flex-col gap-2">
      <div className="relative size-24">
        {/* 선택 = 타일 버튼(이미지 + 업로드중 오버레이) */}
        <button
          type="button"
          onClick={() => onSelect?.(item.id)}
          aria-pressed={selected}
          aria-label={`${item.file.name} 선택`}
          className={cn(
            'block size-full overflow-hidden rounded-[14px] border bg-muted',
            selected ? 'border-primary ring-2 ring-primary' : 'border-input',
          )}
        >
          {!imgError ? (
            <img
              src={previewUrl}
              alt=""
              onError={() => setImgError(true)}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </span>
          )}

          {isUploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/30 text-sm font-medium text-white">
              {item.progress}%
            </span>
          )}
        </button>

        {/* 실패: 이미지 위 원형 재시도 (타일 버튼과 형제 → 중첩 버튼 방지) */}
        {isError && (
          <button
            type="button"
            onClick={retry}
            aria-label="재시도"
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[14px] bg-black/60"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-neutral-600">
              <RefreshCw className="size-5" />
            </span>
          </button>
        )}

        {/* 우상단 제거/취소 X */}
        <button
          type="button"
          onClick={handleRemove}
          aria-label={isUploading ? '취소' : '삭제'}
          className="absolute right-2 top-2 z-20 flex size-5 items-center justify-center rounded-full bg-white/90 text-black shadow"
        >
          <X className="size-3" />
        </button>
      </div>

      <p className="truncate text-xs text-muted-foreground">{item.file.name}</p>
    </div>
  );
}
