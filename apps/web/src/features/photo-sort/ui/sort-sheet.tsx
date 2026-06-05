import { Check, ChevronDown } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/lib/utils/cn';

import { usePhotoSortStore, type SortOrder } from '../model/store';

const OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'desc', label: '최신순' },
  { value: 'asc', label: '오래된순' },
];

export function SortSheet() {
  const order = usePhotoSortStore((s) => s.order);
  const setOrder = usePhotoSortStore((s) => s.setOrder);

  const activeLabel = order === 'desc' ? '최신' : '오래된순';

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        {activeLabel}
        <ChevronDown className="size-3" />
      </DialogTrigger>

      <DialogContent
        side="bottom"
        showClose={false}
        overlayClassName="bg-black/20"
        aria-describedby={undefined}
        className="rounded-t-3xl pb-8 pt-3"
      >
        <DialogTitle className="sr-only">정렬</DialogTitle>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-black/10 dark:bg-white/10" />
        <div className="flex flex-col gap-1 px-6">
          {OPTIONS.map((opt) => (
            <DialogClose asChild key={opt.value}>
              <button
                type="button"
                aria-pressed={order === opt.value}
                onClick={() => setOrder(opt.value)}
                className={cn(
                  'flex h-12 items-center justify-between rounded-[10px] px-4 text-base transition-colors hover:bg-muted',
                  order === opt.value && 'text-primary',
                )}
              >
                {opt.label}
                {order === opt.value && <Check className="size-5" />}
              </button>
            </DialogClose>
          ))}
        </div>
        {/* TODO: "다운로드 안 받은 사진만" 필터 토글 (필터 API 미정) */}
      </DialogContent>
    </Dialog>
  );
}
