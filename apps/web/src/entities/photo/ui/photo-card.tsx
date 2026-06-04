import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils/cn';

import type { Photo } from '../model/types';
import { PhotoThumbnail } from './photo-thumbnail';

interface PhotoCardProps {
  photo: Photo;
  selectionSlot?: ReactNode | undefined;
  actionSlot?: ReactNode | undefined;
  selected?: boolean | undefined;
  onOpen?: ((id: string) => void) | undefined;
}

export function PhotoCard({
  photo,
  selectionSlot,
  actionSlot,
  selected,
  onOpen,
}: PhotoCardProps) {
  return (
    <div className="group relative">
      {selectionSlot && (
        <div className="absolute left-2 top-2 z-10">{selectionSlot}</div>
      )}
      {actionSlot && (
        <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          {actionSlot}
        </div>
      )}
      <button
        type="button"
        onClick={() => onOpen?.(photo.id)}
        aria-label={photo.description}
        className={cn(
          'block w-full overflow-hidden rounded-md text-left ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected && 'ring-2 ring-primary ring-offset-2',
        )}
      >
        <PhotoThumbnail src={photo.imageUrl} alt={photo.description} />
      </button>
    </div>
  );
}
