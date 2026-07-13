import { ImageOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { blurhashToDataUrl } from '../lib/blurhash';
import { useImageRetry } from '../lib/use-image-retry';
import type { ImageErrorHandler } from '../model/types';

import { cn } from '@/shared/lib/utils/cn';

interface PhotoThumbnailProps {
  src?: string | undefined;
  alt: string;
  blurhash?: string | undefined;
  className?: string | undefined;
  onLoadError?: ImageErrorHandler | undefined;
}

export function PhotoThumbnail({
  src,
  alt,
  blurhash,
  className,
  onLoadError,
}: PhotoThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [blurGone, setBlurGone] = useState(false);
  const { activeSrc, failed, handleError } = useImageRetry(src, onLoadError);

  // src가 갈리면(목록 리페치로 서명이 새로 발급 등) 페이드도 처음부터 다시 시작한다.
  useEffect(() => {
    setLoaded(false);
    setBlurGone(false);
  }, [src]);

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
        (!loaded || failed) && 'aspect-square',
        className,
      )}
    >
      {blurUrl && !blurGone && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-md"
        />
      )}
      {activeSrc && !failed && (
        // key: 재시도 시 새 엘리먼트로 교체해 이전 로드 상태가 남지 않게 한다
        <img
          key={activeSrc}
          src={activeSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          data-clarity-mask="True"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          // 페이드(opacity) 종료 시점에 뒤의 블러를 제거 → 회색 깜빡임 없이 정리
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && loaded) setBlurGone(true);
          }}
          className={cn(
            'relative block h-auto w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
      {/* 실패는 블러해시 위에 드러낸다. 계속 블러만 보이면 사용자는 로딩 중으로 오해한다 */}
      {failed && (
        <span
          role="img"
          aria-label="썸네일을 불러오지 못했어요"
          className="absolute inset-0 flex items-center justify-center"
        >
          <ImageOff
            className="size-5 text-white opacity-70 drop-shadow"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      )}
    </div>
  );
}
