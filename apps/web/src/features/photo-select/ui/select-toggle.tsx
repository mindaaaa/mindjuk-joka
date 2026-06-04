import { CheckSquare, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import { useSelectEnabled } from '../model/selectors';
import { usePhotoSelectStore } from '../model/store';

export function SelectToggle() {
  const enabled = useSelectEnabled();
  const toggleMode = usePhotoSelectStore((s) => s.toggleMode);

  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? 'secondary' : 'outline'}
      onClick={toggleMode}
    >
      {enabled ? (
        <>
          <X className="mr-1 size-4" /> 선택 해제
        </>
      ) : (
        <>
          <CheckSquare className="mr-1 size-4" /> 선택
        </>
      )}
    </Button>
  );
}
