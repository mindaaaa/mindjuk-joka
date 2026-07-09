import { useMemo, useState } from 'react';

import { blurhashToDataUrl } from '../lib/blurhash';

import { cn } from '@/shared/lib/utils/cn';

interface PhotoProgressiveImageProps {
  /** 원본(최종 표시 픽셀) */
  src?: string | undefined;
  /** 썸네일(중간 프리뷰). 목록을 거쳐 왔다면 이미 캐시됐을 가능성이 높다 */
  previewSrc?: string | undefined;
  /** blurhash(초기 placeholder) */
  blurhash?: string | undefined;
  alt: string;
}

/**
 * 상세 뷰어용 3단계 progressive 이미지: blurhash → 썸네일 → 원본
 *
 * - 세 레이어를 겹쳐 두고, 위 레이어가 로드되면 페이드인 → 종료 후 아래를 언마운트
 * - 포지셔닝된 부모를 꽉 채우는 absolute 레이어로 렌더한다(부모가 크기·배경 담당)
 * - 최종 픽셀은 원본
 *
 * 상세는 크게 띄우므로 최종 표시는 원본이어야 한다.
 */
export function PhotoProgressiveImage({
  src,
  previewSrc,
  blurhash,
  alt,
}: PhotoProgressiveImageProps) {
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [blurGone, setBlurGone] = useState(false);
  const [previewGone, setPreviewGone] = useState(false);

  const blurUrl = useMemo(
    () => (blurhash ? blurhashToDataUrl(blurhash) : undefined),
    [blurhash],
  );

  return (
    <>
      {/* 1단계: blurhash (object-contain 여백(레터박스)까지 blur로 채운다) */}
      {blurUrl && !blurGone && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-xl"
        />
      )}

      {/* 2단계: 썸네일 (원본 도착 전까지의 빠른 저해상 프리뷰) */}
      {previewSrc && !previewGone && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden
          decoding="async"
          data-clarity-mask="True"
          onLoad={() => setPreviewLoaded(true)}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && previewLoaded)
              setBlurGone(true);
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
            previewLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* 3단계: 원본 (로드되면 위로 페이드인하며 아래를 정리) */}
      {src && (
        <img
          src={src}
          alt={alt}
          decoding="async"
          data-clarity-mask="True"
          onLoad={() => setFullLoaded(true)}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && fullLoaded) {
              setBlurGone(true);
              setPreviewGone(true);
            }
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
            fullLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </>
  );
}
