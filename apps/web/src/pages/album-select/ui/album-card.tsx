import { Check, ChevronRight, Star } from 'lucide-react';

import type { Album } from '@/entities/album';
import { canUpload } from '@/features/auth';
import { cn } from '@/shared/lib/utils/cn';

interface AlbumCardProps {
  album: Album;
  isMain: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleMain: () => void;
}

export function AlbumCard({
  album,
  isMain,
  isSelected,
  onSelect,
  onToggleMain,
}: AlbumCardProps) {
  const editable = canUpload(album.role);

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-3.5 rounded-[20px] bg-muted p-5 transition-transform duration-[140ms] ease-[cubic-bezier(.2,0,0,1)] active:scale-[0.98]"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="truncate text-[17px] font-semibold leading-[25.5px] tracking-[-0.432px] text-foreground">
            {album.name}
          </span>
          <span
            className={cn(
              'inline-flex w-fit self-start whitespace-nowrap rounded-full px-2.5 py-[3px] text-[13px] font-medium',
              editable
                ? 'bg-primary/15 text-primary'
                : 'bg-background text-muted-foreground',
            )}
          >
            {editable ? '편집 가능' : '열람 전용'}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={isMain ? '메인 앨범으로 지정됨' : '메인 앨범으로 지정'}
            aria-pressed={isMain}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMain();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-[140ms] ease-[cubic-bezier(.2,0,0,1)] active:scale-[0.88]"
          >
            <Star
              className={cn(
                'h-5 w-5',
                isMain
                  ? 'fill-favorite text-favorite'
                  : 'fill-none text-muted-foreground/70',
              )}
              strokeWidth={1.5}
            />
          </button>

          {isSelected ? (
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          ) : (
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground/70" />
          )}
        </div>
      </div>

      {isSelected && (
        <div className="pointer-events-none absolute -inset-0.5 rounded-[22px] border-2 border-primary" />
      )}
    </div>
  );
}
