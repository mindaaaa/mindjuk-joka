import { cn } from '@/shared/lib/utils/cn';

import { useSelectEnabled } from '../model/selectors';
import { usePhotoSelectStore } from '../model/store';

export function SelectToggle() {
  const enabled = useSelectEnabled();
  const toggleMode = usePhotoSelectStore((s) => s.toggleMode);

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        'text-[13px] transition-colors',
        enabled
          ? 'font-medium text-primary'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {enabled ? '해제' : '선택'}
    </button>
  );
}
