import type { ReactNode } from 'react';

import { PhotoThumbnail } from './photo-thumbnail';
import type { Photo } from '../model/types';

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
      <button
        type="button"
        onClick={() => onOpen?.(photo.id)}
        aria-label={photo.description}
        className="block w-full overflow-hidden rounded-2xl text-left ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PhotoThumbnail
          src={photo.thumbnailUrl ?? photo.imageUrl}
          alt={photo.description}
          blurhash={photo.blurhash}
        />
        {selected && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/10"
          />
        )}
      </button>
      {selectionSlot && (
        <div className="absolute right-2 top-2 z-10">{selectionSlot}</div>
      )}
      {actionSlot && (
        <div className="absolute bottom-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          {actionSlot}
        </div>
      )}
    </div>
  );
}
