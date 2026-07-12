import { ImagePlus } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { validateFile } from '../lib/validate';
import { useUploadQueueStore } from '../model/store';

import { cn } from '@/shared/lib/utils/cn';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

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

  const openPicker = () => inputRef.current?.click();

  return (
    <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      {/* 데스크톱(마우스): 점선 드롭존 + 드래그 안내. 터치 기기에선 숨김 */}
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors pointer-coarse:hidden',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-input bg-muted/30',
        )}
      >
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <ImagePlus className="h-6 w-6" />
        </span>
        <p className="text-sm leading-5 text-muted-foreground">
          사진을 끌어다 놓거나 버튼을 눌러 선택하세요.
        </p>
        <Button
          type="button"
          onClick={openPicker}
          className="h-14 gap-2 rounded-2xl px-6 text-base font-medium [&_svg]:size-5"
        >
          <ImagePlus aria-hidden />
          사진 추가
        </Button>
      </div>

      {/* 모바일(터치): 점선·안내 없이 단순 "사진 추가" 버튼만  */}
      <Button
        type="button"
        onClick={openPicker}
        className="hidden h-14 w-full gap-2 rounded-2xl text-base font-medium pointer-coarse:flex [&_svg]:size-5"
      >
        <ImagePlus aria-hidden />
        사진 추가
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
