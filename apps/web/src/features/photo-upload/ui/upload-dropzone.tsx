import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils/cn';

import { validateFile } from '../lib/validate';
import { useUploadQueueStore } from '../model/store';

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const enqueue = useUploadQueueStore((s) => s.enqueue);

  function handleFiles(fileList: FileList | null): void {
    if (!fileList) return;

    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      const result = validateFile(file);

      if (!result.ok) {
        toast.error(`${file.name}: ${result.message}`);
        continue;
      }

      if (result.warning) {
        toast.warning(`${file.name}: ${result.warning}`);
      }
      accepted.push(file);
    }

    if (accepted.length > 0) {
      enqueue(accepted);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = '';
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30',
      )}
    >
      <p className="text-sm text-muted-foreground">
        사진·영상을 여기에 끌어다 놓거나 버튼을 눌러 선택하세요.
      </p>
      <Button type="button" onClick={() => inputRef.current?.click()}>
        파일 선택
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={onChange}
      />
    </div>
  );
}
