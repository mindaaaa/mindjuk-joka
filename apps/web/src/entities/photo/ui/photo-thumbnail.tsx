import { useState } from 'react';

import { cn } from '@/shared/lib/utils/cn';

interface PhotoThumbnailProps {
  src?: string | undefined;
  alt: string;
  className?: string | undefined;
}

export function PhotoThumbnail({ src, alt, className }: PhotoThumbnailProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden rounded-md bg-muted',
        className,
      )}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
