import { Button } from '@/shared/ui/button';

import { usePhotoSortStore, type SortOrder } from '../model/store';

const OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'desc', label: '최신순' },
  { value: 'asc', label: '오래된순' },
];

export function SortSheet() {
  const order = usePhotoSortStore((s) => s.order);
  const setOrder = usePhotoSortStore((s) => s.setOrder);

  return (
    <div
      role="group"
      aria-label="정렬"
      className="inline-flex overflow-hidden rounded-md border"
    >
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={order === opt.value ? 'default' : 'ghost'}
          aria-pressed={order === opt.value}
          className="rounded-none"
          onClick={() => setOrder(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
