import { useMemo, useState } from 'react';

import { blurhashToDataUrl } from '../lib/blurhash';

import { cn } from '@/shared/lib/utils/cn';

interface PhotoThumbnailProps {
  src?: string | undefined;
  alt: string;
  blurhash?: string | undefined;
  className?: string | undefined;
}

export function PhotoThumbnail({
  src,
  alt,
  blurhash,
  className,
}: PhotoThumbnailProps) {
  const [loaded, setLoaded] = useState(false);

  // blurhash → data URL 디코딩은 비용이 있으므로 hash가 바뀔 때만 계산한다.
  const blurUrl = useMemo(
    () => (blurhash ? blurhashToDataUrl(blurhash) : undefined),
    [blurhash],
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5',
        // 비율 알기 전 정사각형으로 자리 확보 → 로드 시 실제 비율로 (레이아웃 출렁임 방지, 메이슨리)
        !loaded && 'aspect-square',
        className,
      )}
    >
      {blurUrl && !loaded && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-md"
        />
      )}
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'relative block h-auto w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
