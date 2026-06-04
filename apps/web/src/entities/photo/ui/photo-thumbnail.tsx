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
        'relative overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5',
        // 비율 알기 전 정사각형으로 자리 확보 → 로드 시 실제 비율로 (레이아웃 출렁임 방지, 메이슨리)
        !loaded && 'aspect-square',
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
            'block h-auto w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
