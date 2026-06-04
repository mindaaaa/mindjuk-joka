import { Download } from 'lucide-react';

import {
  SelectedCounter,
  useSelectEnabled,
  useSelectedCount,
  usePhotoSelectStore,
} from '@/features/photo-select';
import { Button } from '@/shared/ui/button';

interface SelectionBarProps {
  onDownload: () => void;
  isDownloading?: boolean;
}

export function SelectionBar({ onDownload, isDownloading }: SelectionBarProps) {
  const enabled = useSelectEnabled();
  const count = useSelectedCount();
  const clear = usePhotoSelectStore((s) => s.clear);

  if (!enabled) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
        <SelectedCounter />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={count === 0}
          >
            선택 해제
          </Button>
          <Button
            type="button"
            onClick={onDownload}
            disabled={count === 0 || isDownloading}
            className="h-10 rounded-full px-5"
          >
            <Download className="mr-1 size-4" />
            {isDownloading ? '다운로드 중…' : '다운로드'}
          </Button>
        </div>
      </div>
    </div>
  );
}
