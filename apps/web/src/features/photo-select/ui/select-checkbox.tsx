import { Check } from 'lucide-react';

import { cn } from '@/shared/lib/utils/cn';

import { useIsSelected } from '../model/selectors';
import { usePhotoSelectStore } from '../model/store';

interface SelectCheckboxProps {
  id: string;
}

export function SelectCheckbox({ id }: SelectCheckboxProps) {
  const selected = useIsSelected(id);
  const toggle = usePhotoSelectStore((s) => s.toggle);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label="선택"
      onClick={(e) => {
        e.stopPropagation();
        toggle(id);
      }}
      className={cn(
        'flex size-6 items-center justify-center rounded-md border-2 bg-background/80 shadow-sm transition',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-muted-foreground/50',
      )}
    >
      {selected && <Check className="size-4" />}
    </button>
  );
}
